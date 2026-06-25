import React from 'react';
import { Text, TextInput } from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native';

export const GARAK_FONT_FAMILY = 'Pretendard';

export const GARAK_FONT_ASSETS = {
  [GARAK_FONT_FAMILY]: require('../../assets/fonts/PretendardVariable.ttf'),
} as const;

export const GARAK_FONT_STYLE: TextStyle = {
  fontFamily: GARAK_FONT_FAMILY,
};

export function withGarakFontStyle(style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  return style === undefined ? GARAK_FONT_STYLE : [GARAK_FONT_STYLE, style];
}

export function GarakText({ style, ...props }: TextProps) {
  return React.createElement(Text, {
    ...props,
    style: withGarakFontStyle(style),
  });
}

export function GarakTextInput({ style, ...props }: TextInputProps) {
  return React.createElement(TextInput, {
    ...props,
    style: withGarakFontStyle(style),
  });
}
