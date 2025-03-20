/**
 * React Native type declarations
 * This file provides type declarations for React Native modules that might be missing
 */

declare module 'react-native' {
  import * as React from 'react';

  // Component types
  export interface ViewProps {
    style?: any;
    [key: string]: any;
  }
  export class View extends React.Component<ViewProps> {}

  export interface TextProps {
    style?: any;
    [key: string]: any;
  }
  export class Text extends React.Component<TextProps> {}

  export interface TextInputProps {
    style?: any;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    [key: string]: any;
  }
  export class TextInput extends React.Component<TextInputProps> {}

  export interface TouchableOpacityProps {
    style?: any;
    onPress?: () => void;
    [key: string]: any;
  }
  export class TouchableOpacity extends React.Component<TouchableOpacityProps> {}

  export interface ScrollViewProps {
    style?: any;
    contentContainerStyle?: any;
    [key: string]: any;
  }
  export class ScrollView extends React.Component<ScrollViewProps> {
    scrollToEnd: (options?: { animated?: boolean }) => void;
  }

  export interface StyleSheetStatic {
    create<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(styles: T | StyleSheet.NamedStyles<T>): T;
    [key: string]: any;
  }
  export const StyleSheet: StyleSheetStatic;

  export namespace StyleSheet {
    interface NamedStyles<T> {
      [key: string]: any;
    }
  }

  export interface ActivityIndicatorProps {
    size?: 'small' | 'large' | number;
    color?: string;
    [key: string]: any;
  }
  export class ActivityIndicator extends React.Component<ActivityIndicatorProps> {}

  export interface AlertStatic {
    alert(title: string, message?: string, buttons?: Array<{text: string, onPress?: () => void}>, options?: any): void;
    [key: string]: any;
  }
  export const Alert: AlertStatic;

  export interface PlatformStatic {
    OS: 'ios' | 'android' | 'web';
    select<T>(spec: {ios?: T, android?: T, default?: T}): T;
    [key: string]: any;
  }
  export const Platform: PlatformStatic;

  export interface FlatListProps<ItemT> {
    data: ReadonlyArray<ItemT>;
    renderItem: ({item, index}: {item: ItemT, index: number}) => React.ReactElement | null;
    keyExtractor?: (item: ItemT, index: number) => string;
    [key: string]: any;
  }
  export class FlatList<ItemT = any> extends React.Component<FlatListProps<ItemT>> {}
}

declare module 'react-native/types' {
  // Add any additional type declarations if needed
}
