import { testForScriptRootFile } from "../src/scriptsBlocks/scriptsBlocksData";


describe("File matching", () => {
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
    ];

    it("doesn't match invalid script file paths", () => {
        for (const filePath of invalid_file_paths) {
            const match = testForScriptRootFile(filePath);
            expect(match).toBeFalsy();
        }
    });
});