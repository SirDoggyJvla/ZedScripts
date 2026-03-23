import { testForScriptRootFile } from "../src/scriptsBlocks/scriptsBlocksData";


describe("File matching - valid paths", () => {
    const file_paths = [
        // linux paths
        "/home/simon/.steam/debian-installation/steamapps/common/ProjectZomboid/projectzomboid/media/scripts/test.txt",
        "/home/user/.steam/debian-installation/steamapps/common/ProjectZomboid/projectzomboid/media/scripts/test_file.txt",
        "/home/user/.steam/debian-installation/steamapps/common/ProjectZomboid/projectzomboid/media/scripts/test.path.txt",

        // windows paths
        "C:\\ProjectZomboid\\media\\scripts\\test.txt",
        "C:\\ProjectZomboid\\media\\scripts\\test_file.txt",
        "C:\\ProjectZomboid\\media\\scripts\\test.path.txt",
    
        // relative paths
        "media/scripts/test.txt",
        "media/scripts/test_file.txt",
        "media/scripts/test.path.txt",

        // subdirectory paths
        "media/scripts/subdir/test.txt",
        "media/scripts/subdir/test_file.txt",
        "media/scripts/subdir/test.path.txt",
        "media/scripts/subdir/anotherOne/test.txt",

        // sandbox options file
        "media/sandbox-options.txt",

        // mod.info file
        "mod.info",

        // edge cases - filename variations
        "media/scripts/config.options.txt",  // multiple dots in filename
        "media/scripts/a.txt",               // single character filename
        "media/scripts/test123.txt",         // numbers in filename
        "media/scripts/FILE_NAME.txt",       // uppercase with underscore
        "media/scripts/file-name.txt",       // dashes in filename
        "media/scripts/my file.txt",         // spaces in filename
        "media/scripts/test@special.txt",    // special characters
        "media/scripts/tëst.txt",            // unicode characters
        "media/scripts/test.txt/other.txt", // additional file after .txt
        "media/scripts/.test.txt",          // hidden file

        // edge cases - deeply nested paths
        "media/scripts/a/b/c/d/e/f/test.txt",
        "media/scripts/mods/custom/weapons/inventory/test.txt",

        // edge cases - path normalization
        "media/scripts/./test.txt",          // current directory reference
        "media/scripts/../scripts/test.txt", // normalized path

        // edge cases - mod.info variations 
        "very/long/path/structure/mod.info",
        "./mod.info",

        // edge cases - sandbox-options variations
        "/absolute/path/media/sandbox-options.txt",
        "C:\\Windows\\Path\\media\\sandbox-options.txt",
    ]

    it("matches valid script file paths", () => {
        for (const filePath of file_paths) {
            const match = testForScriptRootFile(filePath);
            // expect(match).toBeTruthy();
            if (!match) {
                throw new Error(`Failed to match file path: ${filePath}`);
            }
        }
    });
});

describe("File matching - invalid paths", () => {
    const invalid_file_paths = [
        // wrong directory
        "/home/simon/.steam/debian-installation/steamapps/common/ProjectZomboid/projectzomboid/media/other/test.txt",
        "C:\\ProjectZomboid\\media\\other\\test.txt",
        "media/other/test.txt",

        // wrong file extension
        "/home/simon/.steam/debian-installation/steamapps/common/ProjectZomboid/projectzomboid/media/scripts/test.docx",
        "C:\\ProjectZomboid\\media\\scripts\\test.docx",
        "media/scripts/test.docx",

        // invalid sandbox options match
        "sandbox-options.txt",

        // edge cases - case sensitivity (patterns are case-sensitive)
        "media/scripts/test.TXT",           // uppercase extension
        "media/SCRIPTS/test.txt",           // uppercase directory
        "MEDIA/scripts/test.txt",           // uppercase MEDIA
        "media/SANDBOX-OPTIONS.txt",        // uppercase sandbox-options

        // edge cases - incomplete matches
        "media/scripts",                    // missing file extension
        "media/scripts/",                   // missing filename entirely
        "media/scripts/.txt",               // just extension, no name (should match due to regex)
        "scripts/test.txt",                 // missing media directory
        "media/test.txt",                   // missing scripts subdirectory

        // edge cases - extensions and path separators after .txt
        "media/scripts/test.txt.bak",       // extra extension after .txt
        "media/scripts/test.txt.backup",    // extra extension
        "media/scripts/test.txt/extra",     // path separator after .txt
        "media/scripts/test.txt ",          // trailing space

        // edge cases - mod.info variations that don't match
        "mod.info.bak",                     // mod.info with extension
        "mod.info.txt",                     // mod.info with extension
        "mod.info/extra",                   // path after mod.info

        // those two sadly it's hard to exclude them since there's 
        // not enough information in the path of the mod.info of mods
        // "media/scripts/mod.info",           // mod.info in wrong directory
        // "subdir/mod.info",                  // mod.info in subdirectory
        // "./subdir/mod.info",                // mod.info in relative subdirectory

        // edge cases - sandbox-options variations that don't match
        "media/sandbox-options",            // missing extension
        "media/sandbox-options.log",        // wrong extension
        "sandbox-options.txt",              // missing media directory
        "media/sandbox-options.txt/extra",  // path after sandbox-options.txt

        // same as for mod.info
        // "media/OTHER/sandbox-options.txt",  // sandbox-options in wrong directory
        // "media/scripts/sandbox-options.txt",// sandbox-options in wrong directory

        // edge cases - almost correct but not quite
        "media/scripts/.txt",               // no filename before extension
        "",                                 // empty path
        " ",                                // just whitespace
    ];

    it("doesn't match invalid script file paths", () => {
        for (const filePath of invalid_file_paths) {
            const match = testForScriptRootFile(filePath);
            // expect(match).toBeFalsy();
            if (match) {
                throw new Error(`Incorrectly matched invalid file path: ${filePath}`);
            }
        }
    });
});