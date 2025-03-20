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

  export interface ImageProps {
    source: any;
    style?: any;
    [key: string]: any;
  }
  export class Image extends React.Component<ImageProps> {}

  export interface SafeAreaViewProps extends ViewProps {}
  export class SafeAreaView extends React.Component<SafeAreaViewProps> {}

  export interface PressableProps extends ViewProps {
    onPress?: () => void;
    [key: string]: any;
  }
  export class Pressable extends React.Component<PressableProps> {}

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: () => void;
    activeOpacity?: number;
    [key: string]: any;
  }
  export class TouchableOpacity extends React.Component<TouchableOpacityProps> {}

  export interface TextInputProps extends ViewProps {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    [key: string]: any;
  }
  export class TextInput extends React.Component<TextInputProps> {}

  export interface StatusBarProps {
    barStyle?: string;
    backgroundColor?: string;
    [key: string]: any;
  }
  export class StatusBar extends React.Component<StatusBarProps> {}

  export interface AnimatedProps {
    [key: string]: any;
  }
  export class Animated extends React.Component<AnimatedProps> {
    static View: typeof View;
    static Text: typeof Text;
    static Image: typeof Image;
    static createAnimatedComponent: (component: any) => any;
    static timing: (value: any, config: any) => any;
    static spring: (value: any, config: any) => any;
    static decay: (value: any, config: any) => any;
    static Value: any;
    static ValueXY: any;
    static event: (argMapping: any[], config?: any) => any;
  }

  export type StyleProp<T> = T | Array<StyleProp<T>>;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type ImageStyle = any;

  export interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: any;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    [key: string]: any;
  }
  export class ScrollView extends React.Component<ScrollViewProps> {
    scrollToEnd: (options?: { animated?: boolean }) => void;
    scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
  }

  export interface FlatListProps<ItemT> {
    data: ReadonlyArray<ItemT>;
    renderItem: (info: { item: ItemT; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: ItemT, index: number) => string;
    style?: any;
    contentContainerStyle?: any;
    [key: string]: any;
  }
  export class FlatList<ItemT = any> extends React.Component<FlatListProps<ItemT>> {}

  export interface StyleSheetStatic {
    create<T extends { [key: string]: any }>(styles: T): T;
    flatten: (style: any) => any;
    hairlineWidth: number;
    absoluteFill: any;
    [key: string]: any;
  }
  export const StyleSheet: StyleSheetStatic;

  export interface PlatformStatic {
    OS: 'ios' | 'android' | 'web';
    Version: number | string;
    select<T>(spec: { ios?: T; android?: T; default?: T }): T;
    [key: string]: any;
  }
  export const Platform: PlatformStatic;

  export interface ActivityIndicatorProps extends ViewProps {
    animating?: boolean;
    color?: string;
    size?: 'small' | 'large' | number;
    hidesWhenStopped?: boolean;
  }
  export class ActivityIndicator extends React.Component<ActivityIndicatorProps> {}

  // Add missing components
  export interface DimensionsStatic {
    get(dimension: 'window' | 'screen'): {
      width: number;
      height: number;
      scale: number;
      fontScale: number;
    };
    addEventListener(
      type: 'change',
      handler: (dimensions: { window: any; screen: any }) => void
    ): void;
    removeEventListener(
      type: 'change',
      handler: (dimensions: { window: any; screen: any }) => void
    ): void;
  }
  export const Dimensions: DimensionsStatic;

  export interface ModalProps {
    animationType?: 'none' | 'slide' | 'fade';
    transparent?: boolean;
    visible?: boolean;
    onRequestClose?: () => void;
    onShow?: () => void;
    hardwareAccelerated?: boolean;
    statusBarTranslucent?: boolean;
    [key: string]: any;
  }
  export class Modal extends React.Component<ModalProps> {}

  export interface KeyboardAvoidingViewProps extends ViewProps {
    behavior?: 'height' | 'position' | 'padding';
    contentContainerStyle?: any;
    keyboardVerticalOffset?: number;
  }
  export class KeyboardAvoidingView extends React.Component<KeyboardAvoidingViewProps> {}

  export interface LinkingStatic {
    openURL(url: string): Promise<void>;
    canOpenURL(url: string): Promise<boolean>;
    [key: string]: any;
  }
  export const Linking: LinkingStatic;

  export function useColorScheme(): 'light' | 'dark' | null;

  export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }

  export interface AlertStatic {
    alert(
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: { cancelable?: boolean; onDismiss?: () => void }
    ): void;
    prompt(
      title: string,
      message?: string,
      callbackOrButtons?: ((text: string) => void) | AlertButton[],
      type?: string,
      defaultValue?: string,
      keyboardType?: string
    ): void;
  }
  export const Alert: AlertStatic;
}

declare module 'react-native/types' {
  export type ColorValue = string;
}
