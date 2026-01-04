import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { defaultDir } from "../extension";
import { itemCache } from "./cache";

export async function provideDefinition(
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): Promise<vscode.Definition | undefined> {
  const range = document.getWordRangeAtPosition(position, /\bBase\.(\w+)\b/i);
  if (!range) return;

  const fullItemName = document.getText(range);
  const itemName = fullItemName.split('.')[1].toLowerCase();
  console.log(`Recherche de : ${itemName}`);

  // Vérifier le cache en premier
  const cachedLocations = itemCache.get(itemName);
  if (cachedLocations) {
    console.log("Résultat trouvé dans le cache");
    return cachedLocations;
  }

  const config = vscode.workspace.getConfiguration("pzSyntaxExtension");
  const searchDirectories: string[] = config.get("searchDirectories", [defaultDir]);

  // Filtrage des répertoires valides
  const validDirs = searchDirectories.filter(dir => {
    const normalizedDir = path.normalize(dir);
    try {
      return fs.existsSync(normalizedDir) && fs.statSync(normalizedDir).isDirectory();
    } catch {
      return false;
    }
  });

  if (validDirs.length === 0) {
    vscode.window.showErrorMessage("No valid directory found !");
    return;
  }

  // Indexation des fichiers non analysés
  for (const dir of validDirs) {
    try {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(dir, "**/*.txt")
      );

      for (const file of files) {
        if (itemCache.isFileIndexed(file.fsPath)) continue;

        console.log(`Indexation de : ${file.fsPath}`);
        const doc = await vscode.workspace.openTextDocument(file);
        const items = await parseItemsInFile(doc);
        
        items.forEach(({ name, location }) => {
          itemCache.add(file.fsPath, name, location);
        });
        
        itemCache.markFileAsIndexed(file.fsPath);
      }
    } catch (error) {
      console.error(`Erreur avec le répertoire ${dir}:`, error);
    }
  }

  return itemCache.get(itemName) || undefined;
}

async function parseItemsInFile(doc: vscode.TextDocument): Promise<Array<{name: string, location: vscode.Location}>> {
  const text = doc.getText();
  const items = [];
  const pattern = /^\s*item\s+(\w+)\b\s*(\{|[\s\S]*?\{)/gmi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const itemName = match[1].toLowerCase();
    const line = doc.lineAt(doc.positionAt(match.index));
    
    if (!line.text.trim().startsWith('//')) {
      const location = new vscode.Location(doc.uri, new vscode.Position(line.lineNumber, 0));
      items.push({ name: itemName, location });
    }
  }

  return items;
}
