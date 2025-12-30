import { TextDocument, Position } from 'vscode';
import SCRIPTS_TYPES from '../data/scriptBlocks.json';


export interface ScriptBlockParameter {
    name: string;
    description?: string;
    itemTypes?: string[];
}

export interface ScriptBlockID {
    parents?: string[];
    values?: string[];
}

export interface ScriptBlockData {
    version: number;
    name: string;
    description: string;
    shouldHaveParent: boolean;
    needsChildren?: string[];
    parents: string[];
    ID?: ScriptBlockID;
    parameters: { [key: string]: ScriptBlockParameter };
}



// generates a regex pattern to match any script block line
export const blockNames = Object.keys(SCRIPTS_TYPES);
const blockPattern = new RegExp(
    `^\\s*(${blockNames.join('|')})\\s+.*\\{.*$`
);

// detects if a line is starting a script block and returns the block type
function isScriptBlockLine(line: string): string | null {
    const match = line.match(blockPattern);
    return match ? match[1] : null;
}

export function isScriptBlock(word: string): boolean {
    return word in SCRIPTS_TYPES;
}

// check if the position of the doc is within a script block
export function getBlockType(document: TextDocument, lineNumber: number): string | null {
    let currentLine = lineNumber;
    
    while (currentLine >= 0) {
        let line = document.lineAt(currentLine).text.trim();
        const nextLine = currentLine + 1 < document.lineCount ? document.lineAt(currentLine + 1).text.trim() : '';
        
        line = line + " " + nextLine;
        
        const blockName = isScriptBlockLine(line);
        if (blockName) {
            // check the line has { or the next line has {
            if (line.endsWith('{')) {        
                return blockName;
            } else {
                const nextLineNum = currentLine + 1;
                if (nextLineNum < document.lineCount) {
                    const nextLine = document.lineAt(nextLineNum).text.trim();
                    if (nextLine.startsWith('{')) {            
                        return blockName;
                    }
                }
            }
            
            return blockName;
        }
        currentLine--;
    }
    return null;
}


/**
* Retrieve the script block data for a given block type
* @param blockType The script block type
* @returns ScriptBlockData | null
*/
export function getScriptBlockData(blockType: string): ScriptBlockData {
    if (!isScriptBlock(blockType)) {
        throw new Error(`Block type ${blockType} is not a valid script block type. Ensure to check with isScriptBlock() before getting block data.`);
    }
    const blockData = SCRIPTS_TYPES[blockType as keyof typeof SCRIPTS_TYPES] as ScriptBlockData;
    return blockData;
}


export function getDescription(word: string, blockType: string, isScriptBlock: boolean): string | null {
    // if it's a script block, get its description
    if (isScriptBlock) {
        return getScriptBlockDescription(blockType);
    }
    return getParameterDescription(word, blockType);
}

function getScriptBlockDescription(blockType: string): string | null {
    const blockData = getScriptBlockData(blockType);
    if (blockData) {
        if (blockData.description) {
            return blockData.description;
        } else {
            return "No description available for this script block type.";
        }
    }
    return null;
}

function getParameterDescription(word: string, blockType: string): string | null {
    // check if word is a parameter of the block type
    const blockData = SCRIPTS_TYPES[blockType as keyof typeof SCRIPTS_TYPES];
    const lowerWord = word.toLowerCase();
    if (blockData.parameters && lowerWord in blockData.parameters) {
        const paramData = (blockData.parameters as Record<string, any>)[lowerWord];
        if (paramData) {
            if (paramData.description) {
                return paramData.description;
            } else {
                return "No description available for this parameter.";
            }
        }
    }
    
    return null;
}







// DEPRECATED - use src/data/scriptBlocks.json instead

export const VALID_KEYWORDS = {
    craftRecipe: [
        "timedAction",
        "Time",
        "category",
        "Tags",
        "inputs",
        "outputs",
        "itemMapper",
        "SkillRequired",
        "NeedToBeLearn",
        "needTobeLearn",
        "AutoLearnAny",
        "xpAward",
        "OnCreate",
        "OnTest",
        "ToolTip",
        "Tooltip",
        "MetaRecipe",
        "time",
        "tags",
        "needTobeLearn",
        "needToBeLearn",
        "AllowBatchCraft",
        "-fluid",
    ],
    item: [
        // Core
        "DisplayName",
        "DisplayCategory",
        "Type",
        "Weight",
        "Icon",
        "WorldStaticModel",
        "StaticModel",
        "Tags",
        "AcceptItemFunction",
        
        // Autre (à classer)
        "MetalValue",
        "ConditionMax",
        "ConditionLowerChanceOneIn",
        "UseWhileEquipped",
        "UseDelta",
        "ReplaceOnUse",
        "ReplaceOnDeplete",
        "CustomContextMenu",
        "Count",
        "RequiresEquippedBothHands",
        "ConditionLowerStandard",
        "DisappearOnUse",
        "SoundRadius",
        "SoundVolume",
        "AlwaysWelcomeGift",
        "SurvivalGear",
        "FillFromDispenserSound",
        "FillFromLakeSound",
        "FillFromTapSound",
        "FillFromToiletSound",
        "ToolTip",
        "AttachmentType",
        "BaseSpeed",
        "BreakSound",
        "Categories",
        "CritDmgMultiplier",
        "DoorDamage",
        "EnduranceMod",
        "HitSound",
        "IdleAnim",
        "KnockBackOnNoDeath",
        "MaxDamage",
        "MinDamage",
        "PushBackMod",
        "RunAnim",
        "SubCategory",
        "SwingAnim",
        "SwingSound",
        "TreeDamage",
        "WeaponLength",
        "WeaponSprite",
        "TwoHandWeapon",
        "AcceptMediaType",
        "BaseVolumeRange",
        "DisappearOnUse",
        "IsHighTier",
        "IsPortable",
        "IsTelevision",
        "MaxChannel",
        "MinChannel",
        "TransmitRange",
        "TwoWay",
        "UsesBattery",
        "IconColorMask",
        "IconFluidMask",
        "RainFactor",
        "FillFromDispenserSound",
        "CustomEatSound",
        "PourType",
        "CanBeEquipped",
        "BloodLocation",
        "ReplaceInPrimaryHand",
        "ReplaceInSecondHand",
        "RunSpeedModifier",
        "AmmoType",
        "CanStack",
        "GunType",
        "MaxAmmo",
        "TeachedRecipes",
        "PlaceMultipleSound",
        "PlaceOneSound",
        "OnBreak",
        "MetaRecipe",
        "MechanicsItem",
        "ColorBlue",
        "ColorGreen",
        "ColorRed",
        "Tooltip",
        "StaticModel",
        "WorldStaticModelsByIndex",
        "IconsForTexture",
        "ShoutType",
        "ShoutMultiplier",
        // Newly added keywords
        "MechanicsItem",
        "Tooltip",
        "StaticModelsByIndex",
        "WorldStaticModelsByIndex",
        "IconsForTexture",
        "AttachmentReplacement",
        "primaryAnimMask",
        "secondaryAnimMask",
        "ScaleWorldIcon",
        "UseWorldItem",
        "KeepOnDeplete",
        "WeightEmpty",
        "CantBeConsolided",
        "CustomContextMenu",
        "OnEat",
        "OnCreate",
        "ActivatedItem",
        "LightDistance",
        "LightStrength",
        "ticksPerEquipUse",
        "TorchCone",
        "SurvivalGear",
        "MetalValue",
        "ImpactSound",
        "HitAngleMod",
        "MaxHitCount",
        "MaxRange",
        "MinimumSwingTime",
        "SplatBloodOnNoDeath",
        "SplatNumber",
        "SplatSize",
        "SwingAmountBeforeImpact",
        "SwingTime",
        "WeaponSpritesByIndex",
        "HeadCondition",
        "HeadConditionLowerChanceMultiplier",
        "Sharpness",
        "AttachmentType",
        "BaseSpeed",
        "BreakSound",
        "Categories",
        "CritDmgMultiplier",
        "DoorDamage",
        "EnduranceMod",
        "HitSound",
        "IdleAnim",
        "KnockBackOnNoDeath",
        "MaxDamage",
        "MinDamage",
        "PushBackMod",
        "RunAnim",
        "SubCategory",
        "SwingAnim",
        "SwingSound",
        "TreeDamage",
        "WeaponLength",
        "WeaponSprite",
        "TwoHandWeapon",
        "AcceptMediaType",
        "BaseVolumeRange",
        "DisappearOnUse",
        "IsHighTier",
        "IsPortable",
        "IsTelevision",
        "MaxChannel",
        "MinChannel",
        "TransmitRange",
        "TwoWay",
        "UsesBattery",
        "IconColorMask",
        "IconFluidMask",
        "RainFactor",
        "FillFromDispenserSound",
        "CustomEatSound",
        "PourType",
        "CanBeEquipped",
        "BloodLocation",
        "ReplaceInPrimaryHand",
        "ReplaceInSecondHand",
        "RunSpeedModifier",
        "AmmoType",
        "CanStack",
        "GunType",
        "MaxAmmo",
        "TeachedRecipes",
        "PlaceMultipleSound",
        "PlaceOneSound",
        "OnBreak",
        "MetaRecipe",
        "MechanicsItem",
        "ColorBlue",
        "ColorGreen",
        "ColorRed",
        "Tooltip",
        "StaticModel",
        "WorldStaticModelsByIndex",
        "IconsForTexture",
        "ShoutType",
        "ShoutMultiplier",
        "AlwaysKnockdown",
        "AttachmentType",
        "BreakSound",
        "CantAttackWithLowestEndurance",
        "CriticalChance",
        "DamageCategory",
        "DamageMakeHole",
        "DropSound",
        "HitAngleMod",
        "ImpactSound",
        "MaxHitCount",
        "MaxRange",
        "MetalValue",
        "MinimumSwingTime",
        "SplatBloodOnNoDeath",
        "SplatNumber",
        "SplatSize",
        "SwingAmountBeforeImpact",
        "SwingTime",
        "WeaponSpritesByIndex",
        "HeadCondition",
        "HeadConditionLowerChanceMultiplier",
        "Sharpness",
        "DoorHitSound",
        "HitFloorSound",
        "HitWallSound",
        "HitWindowSound",
        "HasMetal",
        "HasToolHead",
        "KnockdownMod",
        "MinAngle",
        "MinRange",
        "NoMaintenanceXp",
        "SoundRadius",
        "SoundVolume",
        "ReloadTimeModifier",
        "DangerousUncooked",
        "IsDung",
        "ConsolidateOption",
        "FireFuelRatio",
        "MediaCategory",
        "FishingLure",
        "Packaged",
        "DangerousUncooked",
        "BoredomChange",
        "EatTime",
        "HerbalistType",
        "Alcoholic",
        "BandagePower",
        "CanBandage",
        "Medical",
        "ItemAfterCleaning",
        "ReduceInfectionPower",
        "FatigueChange",
        "StressChange",
        "AlarmSound",
        "UnequipSound",
        "ProtectFromRainWhenEquipped",
        "EquippedNoSprint",
        "MicRange",
        "NoTransmit",
        "ReadType",
        "ReloadTimeModifier",
        // Newly added keywords
        "WeightModifier",
        "AimingTimeModifier",
        "MaxSightRange",
        "MinSightRange",
        "MountOn",
        "PartType",
        "RecoilDelayModifier",
        "HitChanceModifier",
        "ProjectileSpreadModifier",
        "MaxRangeModifier",
        "LowLightBonus",
        "TorchDot",
        "StaticModel",
        "cantBeConsolided",
        "RemoteController",
        "RemoteRange",
        "UseWhileEquipped",
        "WorldObjectSprite",
        "ConditionLowerStandard",
        "AnimalFeedType",
        "EvolvedRecipe",
        "Spice",
        "ReplaceOnRotten",
        "ReplaceOnCooked",
        "UseWorldItem",
        "AimingPerkCritModifier",
        "AimingPerkHitChanceModifier",
        "AimingPerkMinAngleModifier",
        "AimingPerkRangeModifier",
        "AimingTime",
        "AmmoBox",
        "BringToBearSound",
        "ClipSize",
        "EjectAmmoSound",
        "EjectAmmoStartSound",
        "EjectAmmoStopSound",
        "EquipSound",
        "FireMode",
        "FireModePossibilities",
        "HitChance",
        "InsertAmmoSound",
        "InsertAmmoStartSound",
        "InsertAmmoStopSound",
        "IsAimedFirearm",
        "IsAimedHandWeapon",
        "JamGunChance",
        "MagazineType",
        "ManuallyRemoveSpentRounds",
        "ModelWeaponPart",
        "NPCSoundBoost",
        "PiercingBullets",
        "ProjectileCount",
        "ProjectileSpread",
        "ProjectileWeightCenter",
        "RackAfterShoot",
        "RackSound",
        "Ranged",
        "RecoilDelay",
        "ReloadTime",
        "ShareDamage",
        "ShellFallSound",
        "SoundGain",
        "StopPower",
        "ToHitModifier",
        "WeaponReloadType",
        "HaveChamber",
        "AngleFalloff",
        "InsertAllBulletsReload",
        "RangeFalloff",
        "ClipSize",
        "MultipleHitConditionAffected",
        "AimingMod",
        "ClickSound",
        "UseEndurance",
        // Audio et effets
        "ShoutType",
        "ShoutMultiplier",
        "CookingSound",
        "AlarmSound",
        "CustomDrinkSound",
        "FillFromDispenserSound",
        "FillFromLakeSound",
        "FillFromTapSound",
        "FillFromToiletSound",
        "DamagedSound",
        // Propriétés des conteneurs
        "ContainerName",
        "capacity",
        "PickRandomFluid",
        "EatType",
        "PourType",
        
        // Propriétés des armes
        "TwoHandWeapon",
        "RequiresEquippedBothHands",
        "MetalValue",
        "ConditionLowerChanceOneIn",
        "critDmgMultiplier",
        "CloseKillMove",
        // Tags et catégories
        "IsFireFuel",
        "IsFireTinder",
        "FireFuelRatio",
        "HasMetal",
        "Tags",
        "FitsWallet",
        "FitsKeyRing",
        "SmeltableIronSmall",
        "SmeltableIronMedium",
        "CrudeTongs",
        "BreakOnSmithing",
        "DontInheritCondition",
        "isSeed",
        "IsMemento",
        "CoffeeMaker",
        "Cookable",
        "CookableMicrowave",
        "CleanStains",
        
        // Autres propriétés
        "WorldObjectSprite",
        "StaticModel",
        "Tooltip",
        "MechanicsItem",
        "OnBreak",
        "ReplaceInPrimaryHand",
        "ReplaceInSecondHand",
        "ReplaceOnDeplete",
        "cantBeConsolided",
        "ScaleWorldIcon",
        "primaryAnimMask",
        "secondaryAnimMask",
        "AlcoholPower",
        "-fluid",
        // Véhicule
        "VehicleType",
        "ChanceToSpawnDamaged",
        "MaxCapacity",
        "EngineLoudness",
        "ConditionLowerOffroad",
        "ConditionAffectsCapacity",
        "WheelFriction",
        "SuspensionDamping",
        "SuspensionCompression",
        // Vêtements
        "Capacity",
        "CloseSound",
        "OpenSound",
        "WeightReduction",
        "SoundParameter",
        "AttachmentsProvided",
        "CanHaveHoles",
        "FabricType",
        "ItemWhenDry",
        "Wet",
        "WetCooldown",
        "BodyLocation",
        "ClothingItem",
        "ClothingItemExtra",
        "ClothingItemExtraOption",
        "ClothingExtraSubmenu",
        "CombatSpeedModifier",
        "Insulation",
        "WindResistance",
        "ScratchDefense",
        "BiteDefense",
        "DiscomfortModifier",
        "ChanceToFall",
        "WaterResistance",
        "VisionModifier",
        "HearingModifier",
        // Construction
        "DigType",
        // Conteneurs
        "MaxItemSize",
        // Son
        "PutInSound",
        // Litterature
        "CanBeWrite",
        "PageToWrite",
        // Nourriture
        "CustomDrinkSound",
        "GoodHot",
        "MinutesToCook",
        "MinutesToBurn",
        "EvolvedRecipe",
        "EvolvedRecipeName",
        "SoundMap",
        "BadCold",
        "CookingSound",
        "RemoveUnhappinessWhenCooked",
        "ReduceFoodSickness",
        "ReplaceOnCooked",
        "RemoveNegativeEffectOnCooked",
        "ThirstChange",
        "EatType",
        "PourType",
        "IsCookable",
        "CantBeConsolided",
        "BadInMicrowave",
        "DaysFresh",
        "DaysTotallyRotten",
        "HungerChange",
        "UnhappyChange",
        "Calories",
        "Carbohydrates",
        "Lipids",
        "Proteins",
        "CantEat",
        "FoodType",
        "ReplaceOnRotten",
        "CantBeFrozen",
    ],
    component: [
        "ContainerName",
        "RainFactor",
        "capacity",
        "fluid",
        "-fluid",
        "CustomDrinkSound",
        "PickRandomFluid"
    ],
    itemMapper: ["default"],
    inputs: ["item", "mode:", "flags[", "mappers[", "fluid", "-fluid"],
    flags: [
        "AllowFavorite",
        "InheritFavorite",
        "InheritFoodAge",
        "IsNotDull",
        "MayDegradeLight",
        "Prop1",
        "Prop2",
        "ItemCount",
        "IsFull",
        "NotFull",
        "NotEmpty",
        "AllowDestroyedItem",
    ],
    Fluids : [
        "fluid",
    ]
};

export const PROPERTY_DESCRIPTIONS: { [key: string]: string } = {
    // General Properties
    DisplayName:
    'Display name in the game interface\n\n*Type*: `string`\n*Example*: `DisplayName = "Hammer",`',
    DisplayCategory:
    "Category for inventory sorting\n\n*Common values*: `Weapon, Food, Clothing, Tool`",
    Type: "Main functional type\n\n*Values*: `Normal, Weapon, Food, Clothing, Literature`",
    Weight: "Weight in kilograms\n\n*Example*: `Weight = 0.5,`",
    Icon: 'Inventory icon path\n\n*Format*: Relative image path\n*Example*: `Icon = "Item_Hammer",`',
    
    // Condition Properties
    ConditionMax:
    "Maximum durability (1-100)\n\n*Example*: `ConditionMax = 100,`",
    ConditionLowerChanceOneIn:
    "1-in-X chance of condition loss per use (lower = more fragile)\n*Example*: `ConditionLowerChanceOneIn = 50,`",
    
    // Weapon Properties
    MaxDamage: "Maximum damage value\n*Example*: `MaxDamage = 1.5,`",
    MinDamage: "Minimum damage value",
    CriticalChance:
    "Critical hit chance percentage\n*Example*: `CriticalChance = 30,`",
    WeaponLength: "Melee range in tiles",
    SwingTime: "Attack wind-up time in seconds",
    AimingTime: "Time needed to aim firearms",
    RecoilDelay: "Firearm recoil recovery time",
    
    // Food Properties
    HungerChange: "Hunger reduction (negative values reduce hunger)",
    ThirstChange: "Thirst reduction",
    Calories: "Energy value in kilocalories",
    DaysFresh: "Days until spoilage begins",
    DaysTotallyRotten: "Days until complete rot",
    FoodType: "Type of food\n*Values*: `Vegetable, Meat, Fish, Fruit`",
    
    // Clothing Properties
    BiteDefense: "Bite protection (0-100)",
    ScratchDefense: "Scratch protection (0-100)",
    Insulation: "Thermal insulation value",
    WindResistance: "Wind chill protection",
    WaterResistance: "Rain protection effectiveness",
    
    // Container Properties
    Capacity: "Storage capacity in units",
    WeightReduction:
    "Contains weight reduction percentage\n*Example*: `WeightReduction = 50,`",
    CanBeEquipped: "Equip slots\n*Values*: `Primary, Secondary, Both`",
    
    // Sound Properties
    SwingSound: "Sound played during use",
    ImpactSound: "Sound played on hit",
    EquipSound: "Sound played when equipping",
    UnequipSound: "Sound played when unequipping",
    
    // Visual Properties
    WorldStaticModel: "3D world model path",
    ClothingItem: "Clothing slot\n*Values*: `Hat, Shirt, Pants, Shoes`",
    BloodLocation: "Bleeding effect location",
    
    // Special Properties
    IsWeapon: "Mark as weapon\n*Values*: `true/false`",
    IsCookable: "Can be cooked\n*Example*: `IsCookable = true,`",
    LightStrength: "Light source intensity",
    LightDistance: "Light range in tiles",
    ActivatedItem: "Item requires activation",
    
    // Crafting Properties
    UseDelta: "Usage percentage per action\n*Example*: `UseDelta = 0.2,`",
    ReplaceOnUse:
    'Replacement item after use\n*Example*: `ReplaceOnUse = "Base.HammerDamaged",`',
    RequiresEquippedBothHands: "Needs both hands to use\n*Values*: `true/false`",
};

const CRAFT_RECIPE_DESCRIPTIONS: { [key: string]: string } = {
    time: "Crafting time in seconds\n*Example*: `Time = 120.0,`",
    result: 'Output item\n*Example*: `Result = "Base.WoodenPlank",`',
    resultcount: "Number of items produced\n*Example*: `ResultCount = 4,`",
    skillrequired:
    'Required skill level\n*Example*: `SkillRequired = "Woodwork:2",`',
    keeponuse: "Tool is not consumed\n*Values*: `true/false`",
    needtobelearned:
    "Requires recipe knowledge\n*Example*: `NeedToBeLearned = true,`",
    category: "Crafting category\n*Values*: `Cooking, Carpentry, Electrical`",
    animations: "Animation ID for crafting action",
};


const FLAG_DESCRIPTIONS : { [key: string]: string } = {
    MayDegradeLight : "There's a small chance of damaging the item used",
    Prop1: "Will be in the primary hand",
    Prop2: "Will be in the secondary hand",
}