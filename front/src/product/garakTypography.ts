import React from 'react';
import { Text, TextInput } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

export const GARAK_FONT_FAMILY = 'Pretendard';

export const GARAK_FONT_ASSETS = {
  [GARAK_FONT_FAMILY]: require('../../assets/fonts/PretendardVariable.ttf'),
} as const;

export const GARAK_FONT_STYLE: TextStyle = {
  fontFamily: GARAK_FONT_FAMILY,
};

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
  render?: (...args: unknown[]) => React.ReactNode;
  __garakFontPatched?: boolean;
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
  render?: (...args: unknown[]) => React.ReactNode;
  __garakFontPatched?: boolean;
};

let garakTextDefaultsApplied = false;

export function applyGarakTextDefaults(): void {
  if (garakTextDefaultsApplied) {
    return;
  }

  applyFontToRenderedComponent(Text as TextComponentWithDefaults);
  applyFontToRenderedComponent(TextInput as TextInputComponentWithDefaults);
  garakTextDefaultsApplied = true;
}

function applyFontToRenderedComponent(component: TextComponentWithDefaults | TextInputComponentWithDefaults): void {
  if (component.__garakFontPatched) {
    return;
  }

  const originalRender = component.render;

  if (typeof originalRender !== 'function') {
    appendDefaultFontStyle(component);
    component.__garakFontPatched = true;
    return;
  }

  component.render = function renderWithGarakFont(...args: unknown[]) {
    const renderedElement = originalRender.apply(this, args);

    if (!React.isValidElement<{ style?: StyleProp<TextStyle> }>(renderedElement)) {
      return renderedElement;
    }

    return React.cloneElement(renderedElement, {
      style:
        renderedElement.props.style === undefined
          ? GARAK_FONT_STYLE
          : [renderedElement.props.style, GARAK_FONT_STYLE],
    });
  };

  appendDefaultFontStyle(component);
  component.__garakFontPatched = true;
}

function appendDefaultFontStyle(component: TextComponentWithDefaults | TextInputComponentWithDefaults): void {
  component.defaultProps = component.defaultProps ?? {};
  component.defaultProps.style =
    component.defaultProps.style === undefined
      ? GARAK_FONT_STYLE
      : [component.defaultProps.style, GARAK_FONT_STYLE];
}
