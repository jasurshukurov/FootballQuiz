import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect, G } from 'react-native-svg';

interface JerseyIconProps {
  primary: string;
  secondary?: string;
  pattern?: 'solid' | 'stripes' | 'hoops' | 'halves' | 'sash';
  width?: number;
  height?: number;
}

const JERSEY_PATH =
  'M 16 8 L 8 16 L 8 28 L 16 28 L 16 56 L 48 56 L 48 28 L 56 28 L 56 16 L 48 8 L 40 14 L 24 14 Z';

function PatternFill({
  primary,
  secondary,
  pattern,
}: Pick<JerseyIconProps, 'primary' | 'secondary' | 'pattern'>) {
  const sec = secondary ?? primary;
  switch (pattern) {
    case 'stripes':
      return (
        <>
          <Rect x="0" y="0" width="64" height="64" fill={primary} />
          <Rect x="10" y="0" width="9" height="64" fill={sec} />
          <Rect x="28" y="0" width="9" height="64" fill={sec} />
          <Rect x="46" y="0" width="9" height="64" fill={sec} />
        </>
      );
    case 'hoops':
      return (
        <>
          <Rect x="0" y="0" width="64" height="64" fill={primary} />
          <Rect x="0" y="10" width="64" height="8" fill={sec} />
          <Rect x="0" y="26" width="64" height="8" fill={sec} />
          <Rect x="0" y="42" width="64" height="8" fill={sec} />
        </>
      );
    case 'halves':
      return (
        <>
          <Rect x="0" y="0" width="32" height="64" fill={primary} />
          <Rect x="32" y="0" width="32" height="64" fill={sec} />
        </>
      );
    case 'sash':
      return (
        <>
          <Rect x="0" y="0" width="64" height="64" fill={primary} />
          <Path d="M 48 0 L 64 0 L 16 64 L 0 64 Z" fill={sec} />
        </>
      );
    default:
      return <Rect x="0" y="0" width="64" height="64" fill={primary} />;
  }
}

function JerseyIconInner({
  primary,
  secondary,
  pattern = 'solid',
  width = 36,
  height = 36,
}: JerseyIconProps) {
  return (
    <View
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
      }}>
      <Svg width={width} height={height} viewBox="0 0 64 64">
        <Defs>
          <ClipPath id="jerseyClip">
            <Path d={JERSEY_PATH} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#jerseyClip)">
          <PatternFill primary={primary} secondary={secondary} pattern={pattern} />
        </G>
        <Path
          d={JERSEY_PATH}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export const JerseyIcon = React.memo(JerseyIconInner);
