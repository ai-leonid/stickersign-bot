export type FontPresetConfig = {
  name: string;
  fontFamily: string;
  file?: string;
  fontSize?: number;
};

export const fontPresets: FontPresetConfig[] = [
  {
    name: 'Oi Regular',
    fontFamily: 'Oi Regular',
    file: 'Oi-Regular/Oi-Regular.ttf',
  },
  {
    name: 'Impact',
    fontFamily: 'Impact',
  },
  {
    name: 'Comic Sans MS',
    fontFamily: 'Comic Sans MS',
  },
  {
    name: 'Arial Black',
    fontFamily: 'Arial Black',
  },
  {
    name: 'Trebuchet MS',
    fontFamily: 'Trebuchet MS',
  },
  {
    name: 'Georgia',
    fontFamily: 'Georgia',
  },
];
