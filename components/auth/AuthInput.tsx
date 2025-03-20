import { StyleSheet, Text, TextInput, View, TextInputProps, Animated, Platform, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  editable?: boolean;
  required?: boolean;
};

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  keyboardType,
  autoCapitalize,
  editable = true,
  required = false,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const animatedIsFocused = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  React.useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedIsFocused]);

  return (
    <View style={styles.container}>
      <Animated.Text 
        style={{
          ...styles.label,
          position: 'absolute' as const,
          left: 16,
          top: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [16, -10],
          }),
          fontSize: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
          }),
          color: isFocused ? '#FF9800' : '#666',
          backgroundColor: 'white',
          paddingHorizontal: 4,
          zIndex: 10,
        }}
      >
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Animated.Text>
      <TextInput
        style={[
          styles.input, 
          isFocused && styles.focusedInput,
          error && styles.errorInput,
          !editable && styles.inputDisabled
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={isFocused ? placeholder : ''}
        secureTextEntry={secureTextEntry && !passwordVisible}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={editable}
      />
      {secureTextEntry && (
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={togglePasswordVisibility}
        >
          {passwordVisible ? (
            <EyeOff size={20} color={Colors.text.secondary} />
          ) : (
            <Eye size={20} color={Colors.text.secondary} />
          )}
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  requiredStar: {
    color: '#FF9800',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    height: 56,
  },
  focusedInput: {
    borderColor: '#FF9800',
  },
  errorInput: {
    borderColor: '#D32F2F',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 4,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
  },
});

export type { AuthInputProps };