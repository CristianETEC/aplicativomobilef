import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  useColorScheme,
  Keyboard,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import {
  initDB,
  getItems,
  insertItem,
  updateItem,
  deleteItem,
} from "../src/database/db";
import ProductItem from "../src/components/ProductItem";

/**
 * Helper: format number to currency "R$ 1.234,56"
 */
function formatCurrency(value: number) {
  // using Intl.NumberFormat — supported in Expo
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Helper: normalize and mask price input while typing.
 * Accepts strings like "12", "12.5", "12,50" and returns "12.50"
 * Returns an object with `display` for input value and `raw` as float number.
 */
function maskPriceInput(value: string) {
  // remove any non-digit and non separator
  let v = value.replace(/[^\d.,]/g, "");
  // replace comma with dot
  v = v.replace(",", ".");
  // keep only first dot
  const firstDotIndex = v.indexOf(".");
  if (firstDotIndex >= 0) {
    const before = v.slice(0, firstDotIndex + 1);
    let after = v.slice(firstDotIndex + 1).replace(/\./g, ""); // remove other dots
    // limit to two decimals
    after = after.slice(0, 2);
    v = before + after;
  }
  // compute number
  const raw = v ? parseFloat(v) || 0 : 0;
  // Display with localized decimals while typing: keep original-ish format
  let display = v;
  // if user typed only digits, allow it; if contains dot, keep as is
  return { display, raw };
}

type Produto = {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
};

type SortMode = "recent" | "alphabet" | "price" | "quantity";

export default function App(): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [nome, setNome] = useState("");
  const [precoText, setPrecoText] = useState("");
  const [quantidadeText, setQuantidadeText] = useState("");
  const [items, setItems] = useState<Produto[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await initDB();
      const data = await getItems();
      // db.getAllAsync may return objects with keys as strings; ensure types
      setItems(Array.isArray(data) ? data.map((d: any) => ({
        id: Number(d.id),
        nome: String(d.nome),
        preco: Number(d.preco),
        quantidade: Number(d.quantidade)
      })) : []);
    } catch (err) {
      console.error("loadData error", err);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  // totals and derived values
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    items.forEach((it) => {
      totalQty += Number(it.quantidade || 0);
      // ensure numeric
      totalValue += Number(it.preco || 0) * Number(it.quantidade || 0);
    });
    return { totalQty, totalValue };
  }, [items]);

  // filtered + sorted list
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = items.filter((it) => (it.nome || "").toLowerCase().includes(q));
    switch (sortMode) {
      case "alphabet":
        filtered = filtered.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case "price":
        filtered = filtered.sort((a, b) => a.preco - b.preco);
        break;
      case "quantity":
        filtered = filtered.sort((a, b) => a.quantidade - b.quantidade);
        break;
      case "recent":
      default:
        filtered = filtered.sort((a, b) => b.id - a.id);
        break;
    }
    return filtered;
  }, [items, search, sortMode]);

  // save (insert or update)
  async function handleSave() {
    const nomeTrim = nome.trim();
    if (!nomeTrim) return Alert.alert("Atenção", "Informe o nome!");
    if (!precoText.trim()) return Alert.alert("Atenção", "Informe o preço!");
    if (!quantidadeText.trim()) return Alert.alert("Atenção", "Informe a quantidade!");

    // mask and parse
    const { raw: preco } = maskPriceInput(precoText);
    const quantidade = parseInt(quantidadeText.replace(/\D/g, "")) || 0;

    if (isNaN(preco) || preco <= 0) return Alert.alert("Atenção", "Preço inválido!");
    if (quantidade <= 0) return Alert.alert("Atenção", "Quantidade inválida!");

    try {
      if (editingId) {
        await updateItem(editingId, nomeTrim, preco, quantidade);
        Alert.alert("Sucesso", "Produto atualizado!");
      } else {
        await insertItem(nomeTrim, preco, quantidade);
        Alert.alert("Sucesso", "Produto cadastrado!");
      }
      Keyboard.dismiss();
      clearForm();
      loadData();
    } catch (err) {
      console.error("save error", err);
      Alert.alert("Erro", "Não foi possível salvar o produto.");
    }
  }

  function clearForm() {
    setNome("");
    setPrecoText("");
    setQuantidadeText("");
    setEditingId(null);
  }

  async function handleDeleteConfirm(id: number) {
    Alert.alert("Excluir", "Deseja realmente excluir este item?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteItem(id);
            loadData();
          } catch (err) {
            console.error("delete error", err);
            Alert.alert("Erro", "Não foi possível excluir.");
          }
        },
      },
    ]);
  }

  function startEdit(item: Produto) {
    setEditingId(item.id);
    setNome(item.nome);
    // show formatted price in input (with dot decimal)
    setPrecoText(String(item.preco));
    setQuantidadeText(String(item.quantidade));
  }

  function toggleSort() {
    // cycle through sort modes
    const order: SortMode[] = ["recent", "alphabet", "price", "quantity"];
    const idx = order.indexOf(sortMode);
    const next = order[(idx + 1) % order.length];
    setSortMode(next);
  }

  // small UI components
  const SortLabel = () => {
    switch (sortMode) {
      case "alphabet": return "Ordem: A→Z";
      case "price": return "Ordem: Preço";
      case "quantity": return "Ordem: Qtd";
      default: return "Ordem: Recentes";
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : null]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.titleDark : null]}>Cadastro de Produtos</Text>
        <Text style={[styles.subtitle, isDark ? styles.titleDark : null]}>
          {visibleItems.length} itens • {totals.totalQty} unidades • {formatCurrency(totals.totalValue)}
        </Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          placeholder="Buscar por nome..."
          placeholderTextColor={isDark ? "#aaa" : "#666"}
          style={[styles.searchInput, isDark ? styles.searchInputDark : null]}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.row}>
          <TouchableOpacity style={[styles.smallBtn, isDark ? styles.smallBtnDark : null]} onPress={toggleSort}>
            <Text style={styles.smallBtnText}><SortLabel /></Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.smallBtn, isDark ? styles.smallBtnDark : null]} onPress={() => { loadData(); }}>
            <Text style={styles.smallBtnText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.form, isDark ? styles.formDark : null]}>
        <TextInput
          placeholder="Nome"
          placeholderTextColor={isDark ? "#bbb" : "#666"}
          value={nome}
          onChangeText={setNome}
          style={[styles.input, isDark ? styles.inputDark : null]}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Preço (ex: 10.50)"
            placeholderTextColor={isDark ? "#bbb" : "#666"}
            value={precoText}
            onChangeText={(t) => {
              const { display } = maskPriceInput(t);
              setPrecoText(display);
            }}
            keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
            style={[styles.input, styles.inputHalf, isDark ? styles.inputDark : null]}
          />

          <TextInput
            placeholder="Quantidade"
            placeholderTextColor={isDark ? "#bbb" : "#666"}
            value={quantidadeText}
            onChangeText={(t) => setQuantidadeText(t.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            style={[styles.input, styles.inputHalf, isDark ? styles.inputDark : null]}
          />
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, isDark ? styles.buttonDark : null]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{editingId ? "Salvar Alterações" : "Cadastrar"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonAlt, isDark ? styles.buttonAltDark : null]}
            onPress={clearForm}
          >
            <Text style={styles.buttonAltText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listWrap}>
        {loading ? (
          <Text style={[styles.loadingText, isDark ? styles.loadingTextDark : null]}>Carregando...</Text>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
                <ProductItem item={item} onEdit={() => startEdit(item)} onDelete={() => handleDeleteConfirm(item.id)} />
              </Animated.View>
            )}
            ListEmptyComponent={<Text style={[styles.emptyText, isDark ? styles.emptyTextDark : null]}>Nenhum produto encontrado</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#f5f5f5" },
  containerDark: { backgroundColor: "#121212" },
  header: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: "#222" },
  titleDark: { color: "#fff" },
  subtitle: { textAlign: "center", color: "#666", marginTop: 6 },
  controls: { marginBottom: 10 },
  searchInput: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    color: "#000"
  },
  searchInputDark: {
    backgroundColor: "#1e1e1e",
    color: "#fff"
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center" as const },
  smallBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  smallBtnDark: { backgroundColor: "#1e1e1e" },
  smallBtnText: { color: "#333", fontWeight: "600" },
  form: { marginBottom: 12 },
  formDark: {},
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    color: "#000"
  },
  inputDark: { backgroundColor: "#1e1e1e", color: "#fff" },
  inputHalf: { flex: 1, marginRight: 6 },
  button: {
    backgroundColor: "#2196f3",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center"
  },
  buttonDark: { backgroundColor: "#1976d2" },
  buttonText: { color: "#fff", fontWeight: "700" },
  buttonAlt: {
    backgroundColor: "#e0e0e0",
    padding: 12,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: "center"
  },
  buttonAltDark: { backgroundColor: "#2a2a2a" },
  buttonAltText: { color: "#333", fontWeight: "700" },

  listWrap: { flex: 1, marginTop: 6 },
  loadingText: { textAlign: "center", marginTop: 30, color: "#444" },
  loadingTextDark: { color: "#aaa" },
  emptyText: { textAlign: "center", marginTop: 20, color: "#666" },
  emptyTextDark: { color: "#888" }
});
