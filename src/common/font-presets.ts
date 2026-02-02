export type FontPresetConfig = {
  name: string;
  fontFamily: string;
  file?: string;
  fontSize?: number;
};

export const fontPresets: FontPresetConfig[] = [
  {
    name: 'Caveat',
    fontFamily: 'Caveat',
    file: 'Caveat/Caveat-Regular.ttf',
  },
  {
    name: 'Comic_Relief',
    fontFamily: 'Caveat',
    file: 'Comic_Relief/ComicRelief-Regular.ttf',
  },
  {
    name: 'Dela_Gothic_One',
    fontFamily: 'Dela_Gothic_One',
    file: 'Dela_Gothic_One/DelaGothicOne-Regular.ttf',
  },
  {
    name: 'Google_Sans_Code',
    fontFamily: 'Google_Sans_Code',
    file: 'Google_Sans_Code/GoogleSansCode-Regular.ttf',
  },
  {
    name: 'Kablammo',
    fontFamily: 'Kablammo',
    file: 'Kablammo/Kablammo-Regular-VariableFont_MORF.ttf',
  },
  {
    name: 'Oi Regular',
    fontFamily: 'Oi Regular',
    file: 'Oi-Regular/Oi-Regular.ttf',
  },
  {
    name: 'Rampart_One',
    fontFamily: 'Rampart_One',
    file: 'Rampart_One/RampartOne-Regular.ttf',
  },
  {
    name: 'Roboto',
    fontFamily: 'Roboto',
    file: 'Roboto/Roboto_Condensed-Regular.ttf',
  },
  {
    name: 'Rubik_Distressed',
    fontFamily: 'Rubik_Distressed',
    file: 'Rubik_Distressed/RubikDistressed-Regular.ttf',
  },
  {
    name: 'Rubik_Iso',
    fontFamily: 'Rubik_Iso',
    file: 'Rubik_Iso/RubikIso-Regular.ttf',
  },
  {
    name: 'Rubik_Wet_Paint',
    fontFamily: 'Rubik_Wet_Paint',
    file: 'Rubik_Wet_Paint/RubikWetPaint-Regular.ttf',
  },
  {
    name: 'Stalinist_One',
    fontFamily: 'Stalinist_One',
    file: 'Stalinist_One/StalinistOne-Regular.ttf',
  },
  {
    name: 'Tinos',
    fontFamily: 'Tinos',
    file: 'Tinos/Tinos-Regular.ttf',
  },
];
