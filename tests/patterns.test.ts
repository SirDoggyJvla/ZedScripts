import { parameterRegex, scriptBlockRegex } from "../src/models/regexPatterns";
import { getRegex } from "./util";

describe("Block header pattern", () => {
    const pattern = getRegex(scriptBlockRegex);

    it("matches with no name", () => {
        const match = pattern.exec("inputs {");
        expect(match).toBeTruthy();
        expect(match?.groups?.type).toBe("inputs");
        expect(match?.groups?.name).toBe("");
    });

    it("matches with inline bracket", () => {
        const match = pattern.exec("module MyModule {");
        expect(match).toBeTruthy();
        expect(match?.groups?.type).toBe("module");
        expect(match?.groups?.name).toBe("MyModule");
    });

    it("matches with bracket on new line", () => {
        const match = pattern.exec("module MyModule\n{");
        expect(match).toBeTruthy();
        expect(match?.groups?.type).toBe("module");
        expect(match?.groups?.name).toBe("MyModule");
    });

    it("matches with space in name", () => {
        const match = pattern.exec("module MyModule WithASpace {");
        expect(match).toBeTruthy();
        expect(match?.groups?.type).toBe("module");
        expect(match?.groups?.name).toBe("MyModule WithASpace");
    });

    it("matches with symbols in name", () => {
        const match = pattern.exec("module !MyModule###WithSymbols_ {");
        expect(match).toBeTruthy();
        expect(match?.groups?.type).toBe("module");
        expect(match?.groups?.name).toBe("!MyModule###WithSymbols_");
    });
});

describe("Block parameter pattern", () => {
    const pattern = getRegex(parameterRegex);

    it("matches with spaces around syntax", () => {
        const match = pattern.exec("WorldStaticModel  =    EngineParts    , ");
        expect(match).toBeTruthy();
        expect(match?.groups?.name).toBe("WorldStaticModel");
        expect(match?.groups?.value).toBe("EngineParts");
    });

    it("matches with no spaces around syntax", () => {
        const match = pattern.exec("WorldStaticModel = EngineParts,");
        expect(match).toBeTruthy();
        expect(match?.groups?.name).toBe("WorldStaticModel");
        expect(match?.groups?.value).toBe("EngineParts");
    });

    it("doesn't match with no comma", () => {
        const match = pattern.exec("Icon = SomeIcon");
        expect(match).toBeFalsy();
    });

    describe("value", () => {
        it("matches with space", () => {
            const match = pattern.exec("recipes = Intermediate Mechanics,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("recipes");
            expect(match?.groups?.value).toBe("Intermediate Mechanics");
        });

        it("matches with registry syntax", () => {
            const match = pattern.exec("ItemType = base:normal,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("ItemType");
            expect(match?.groups?.value).toBe("base:normal");
        });

        it("matches with skill syntax", () => {
            const match = pattern.exec("skills = Mechanics:2,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("skills");
            expect(match?.groups?.value).toBe("Mechanics:2");
        });

        it("matches with registry syntax", () => {
            const match = pattern.exec("ItemType = base:normal,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("ItemType");
            expect(match?.groups?.value).toBe("base:normal");
        });

        it("matches with XYZ syntax", () => {
            const match = pattern.exec("offset = 1.2 33.44 567.890,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("offset");
            expect(match?.groups?.value).toBe("1.2 33.44 567.890");
        });

        it("matches with itemmapper syntax", () => {
            const match = pattern.exec("Base.Bullets9mm = Base.Bullets9mmBox,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("Base.Bullets9mm");
            expect(match?.groups?.value).toBe("Base.Bullets9mmBox");
        });

        it("matches with decimal number", () => {
            const match = pattern.exec("Weight = 123.456,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("Weight");
            expect(match?.groups?.value).toBe("123.456");
        });

        it("matches with string list", () => {
            const match = pattern.exec("Tags = One;Two.AndAHalf;Three,");
            expect(match).toBeTruthy();
            expect(match?.groups?.name).toBe("Tags");
            expect(match?.groups?.value).toBe("One;Two.AndAHalf;Three");
        });
    });
});
