import { IndexRange } from '../utils/positions';
import { 
    ThemeColorType, 
    DiagnosticType, 
    DefaultText, 
    WIKI_LINK,
    formatText
} from '../models/enums';
import { diagnostic } from '../providers/diagnostic';

export class TranslationKeyValue {
    key: string;
    value: string;
    quote: string;
    comma: string;
    
    keyRange: IndexRange;
    valueRange: IndexRange;
    quoteRange: IndexRange;
    commaRange: IndexRange;

    constructor(key: string, value: string, quote: string, comma: string, keyRange: IndexRange, valueRange: IndexRange, quoteRange: IndexRange, commaRange: IndexRange) {
        this.key = key;
        this.value = value;
        this.quote = quote;
        this.comma = comma;

        this.keyRange = keyRange;
        this.valueRange = valueRange;
        this.quoteRange = quoteRange;
        this.commaRange = commaRange;
    }
}