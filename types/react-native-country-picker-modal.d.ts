declare module 'react-native-country-picker-modal' {
  export interface Country {
    callingCode: string[];
    cca2: string;
    currency: string[];
    flag: string;
    name: string;
    region: string;
    subregion: string;
  }

  export interface CountryPickerProps {
    countryCode?: string;
    withFilter?: boolean;
    withFlag?: boolean;
    withCountryNameButton?: boolean;
    withAlphaFilter?: boolean;
    withCallingCode?: boolean;
    withEmoji?: boolean;
    onSelect: (country: Country) => void;
    visible?: boolean;
    onClose?: () => void;
    containerButtonStyle?: any;
    renderFlagButton?: (props: any) => JSX.Element;
    renderCountryFilter?: (props: any) => JSX.Element;
  }

  export default function CountryPicker(props: CountryPickerProps): JSX.Element;
}
