import { Kanit, Prompt, Sarabun, Bai_Jamjuree } from 'next/font/google';

const kanit = Kanit({
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    subsets: ['latin', 'thai'],
    variable: '--font-kanit',
    display: 'swap',
});

const prompt = Prompt({
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    style: ['normal', 'italic'],
    subsets: ['latin', 'thai'],
    variable: '--font-kanit', // Re-using the same variable name to avoid changing globals.css
    display: 'swap',
});

const sarabun = Sarabun({
    weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
    style: ['normal', 'italic'],
    subsets: ['latin', 'thai'],
    variable: '--font-kanit',
    display: 'swap',
});

const baiJamjuree = Bai_Jamjuree({
    weight: ['200', '300', '400', '500', '600', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin', 'thai'],
    variable: '--font-kanit',
    display: 'swap',
});

export type FontFamily = 'Kanit' | 'Prompt' | 'Sarabun' | 'BaiJamjuree';

export const fontMap = {
    Kanit: kanit,
    Prompt: prompt,
    Sarabun: sarabun,
    BaiJamjuree: baiJamjuree,
};

export function getFont() {
    const fontName = (process.env.NEXT_PUBLIC_FONT_FAMILY as FontFamily) || 'Kanit';
    return fontMap[fontName] || kanit;
}
