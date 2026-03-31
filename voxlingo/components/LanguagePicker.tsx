import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LANGUAGES } from '../constants/languages';

type Props = {
  selectedCode: string;
  onSelect: (code: string) => void;
  label: string;
};

export function LanguagePicker({ selectedCode, onSelect, label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCode}
          onValueChange={onSelect}
          style={styles.picker}
        >
          {LANGUAGES.map((lang) => (
            <Picker.Item key={lang.code} label={lang.name} value={lang.code} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 48,
  },
});
