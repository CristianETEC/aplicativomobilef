import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function ProductItem({ item, onEdit, onDelete }) {
  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.item}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nome}</Text>
        <Text style={styles.text}>Preço: R$ {item.preco.toFixed(2)}</Text>
        <Text style={styles.text}>Quantidade: {item.quantidade}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.btn, styles.green]} onPress={onEdit}>
          <Text style={styles.btnText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.red]} onPress={onDelete}>
          <Text style={styles.btnText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2
  },
  name: {
    fontSize: 18,
    fontWeight: "bold"
  },
  text: {
    color: "#444"
  },
  buttons: {
    justifyContent: "space-between"
  },
  btn: {
    padding: 8,
    borderRadius: 8,
    width: 70,
    alignItems: "center"
  },
  green: { backgroundColor: "#4caf50" },
  red: { backgroundColor: "#f44336" },
  btnText: {
    color: "#fff",
    fontWeight: "bold"
  }
});
