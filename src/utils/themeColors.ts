import { extensions, workspace } from "vscode";
import path from "path";
import { ThemeColorType } from "../models/enums";

/**
* Retrieves token colors for a given theme.
* https://github.com/microsoft/vscode/issues/32813#issuecomment-3236474810
*/
export function getTokenColorsForTheme(themeName: string) {
    const tokenColors = new Map();
    let currentThemePath;
    for (const extension of extensions.all) {
        const themes = extension.packageJSON.contributes && extension.packageJSON.contributes.themes;
        const currentTheme = themes && themes.find((theme: any) => theme.label === themeName);
        if (currentTheme) {
            currentThemePath = path.join(extension.extensionPath, currentTheme.path);
            break;
        }
    }
    const themePaths = [];
    if (currentThemePath) { themePaths.push(currentThemePath); }
    while (themePaths.length > 0) {
        const themePath = themePaths.pop();
        if (!themePath) throw new Error("this is to make typescript happy");
        const theme: any = require(themePath);
        if (theme) {
            if (theme.include) {
                themePaths.push(path.join(path.dirname(themePath), theme.include));
            }
            if (theme.tokenColors) {
                theme.tokenColors.forEach((rule: any) => {
                    if (typeof rule.scope === "string" && !tokenColors.has(rule.scope)) {
                        tokenColors.set(rule.scope, rule.settings);
                    } else if (rule.scope instanceof Array) {
                        rule.scope.forEach((scope: any) => {
                            if (!tokenColors.has(scope)) {
                                tokenColors.set(scope, rule.settings);
                            }
                        });
                    }
                });
            }
        }
    }
    return (token: string) => {
        while(!tokenColors.has(token)) {
            if(token.includes(".")) {
                token = token.slice(0, token.lastIndexOf("."));
            } else {
                return undefined;
            }
        }
        return tokenColors.get(token);
    };
}

export function getThemeColors(): any {
    // retrieve the current theme name and colors
    const themeName = workspace.getConfiguration("workbench").get("colorTheme");
    const tokenColors = getTokenColorsForTheme(themeName as string);
    return tokenColors;
}

export function getColor(type: ThemeColorType): string {
    const tokenColors = getThemeColors();
    return tokenColors(type)?.foreground;
}
