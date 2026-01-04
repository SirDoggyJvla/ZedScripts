export function colorText2(text: string, color?: string, fontStyle?: string): string {
    if (!color && !fontStyle) return text;
    
    const styles: string[] = [];
    if (color) styles.push(`color: ${color}`);
    if (fontStyle) {
        if (fontStyle.includes('bold')) styles.push('font-weight: bold');
        if (fontStyle.includes('italic')) styles.push('font-style: italic');
        if (fontStyle.includes('underline')) styles.push('text-decoration: underline');
    }
    
    return `<span style="${styles.join('; ')}">${text}</span>`;
}

export function colorText(text: string, color?: string, fontStyle?: string): string {
    if (!color && !fontStyle) return text;
    let txt = `<span style="color:${color};">${text}</span>`;
    switch (fontStyle) {
        case "bold": // bold is handled in the tree formatting, so we just return colored text here
            txt = `${txt}`;
            break;
        case "italic":
            txt = `*${txt}*`;
            break;
    }
    return txt;
}

export function underlineText(text: string): string {
    return `<ins>${text}</ins>`;
}

export function boldText(text: string): string {
    return `<strong>${text}</strong>`;
}