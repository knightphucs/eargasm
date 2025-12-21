// src/styles/AppStyles.ts
import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const AppStyles = StyleSheet.create({
  // --- CONTAINER & LAYOUT ---
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop: 50,
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#1c1c1e' 
  },

  // --- NAVIGATION BAR ---
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: 'white', fontSize: 18, marginLeft: 5, fontWeight: '500' },

  // --- HEADER & TITLES ---
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  title: { 
    color: "white", 
    fontSize: 28, 
    fontWeight: "bold" 
  },
  headerContainer: { alignItems: 'center', paddingVertical: 20 },
  headerTitle: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: '800', 
    textAlign: 'center', 
    marginBottom: 8, 
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: {width: -1, height: 1}, 
    textShadowRadius: 10
  },
  headerSubtitle: { 
    color: '#ddd', 
    fontSize: 14, 
    marginBottom: 20, 
    fontWeight: '500',
    letterSpacing: 0.5 
  },

  // --- IMAGES & COVERS ---
  coverShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 25,
    backgroundColor: '#000',
  },
  coverImage: { width: 220, height: 220, borderRadius: 12 },
  thumb: { width: 45, height: 45, borderRadius: 8, marginRight: 12 },
  
  // --- BUTTONS ---
  createBtn: {
    backgroundColor: "#282828",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  createBtnText: { color: "#1DB954", fontWeight: "bold", fontSize: 14 },
  iconBtn: { marginRight: 15, padding: 5 },
  buttonRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '90%' 
  },
  gradientButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 14, 
    borderRadius: 30, 
    shadowColor: "#E91E63", 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 10,
  },
  gradientButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16, 
    marginLeft: 8, 
    letterSpacing: 1 
  },
  circleButton: {
    width: 50, 
    height: 50, 
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)'
  },
  deleteBtn: { 
    backgroundColor: "#E91E63", 
    justifyContent: "center", 
    alignItems: "center", 
    width: 80, 
    height: "100%",
    borderRadius: 12,
    marginRight: 15,
  },
  addBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 20, 
    justifyContent: 'center', 
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 15,
    borderRadius: 12,
  },
  addText: { color: "#E91E63", fontSize: 16, fontWeight: "bold", marginLeft: 10 },

  // --- LIST ITEMS (Grid & List) ---
  gridItem: { width: "48%", marginBottom: 20 },
  gridImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#333",
  },
  listItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "transparent",
  },
  listImg: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
    backgroundColor: "#333",
  },
  listInfo: { flex: 1, justifyContent: 'center' },
  name: { color: "white", fontWeight: "bold", fontSize: 16 },
  count: { color: "#b3b3b3", fontSize: 14, marginTop: 4 },
  
  // --- CARD STYLE ROW ---
  rowCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 10, 
    marginBottom: 8, 
    backgroundColor: 'rgba(30,30,30, 0.6)',
    borderRadius: 12, 
    marginHorizontal: 15,
  },
  tName: { color: "white", fontWeight: "600", fontSize: 15 },
  tArtist: { color: "#ccc", fontSize: 13, marginTop: 2 },

  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "#282828",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 0.5, 
    borderColor: '#333' 
  },
  input: {
    width: "100%",
    backgroundColor: "#3E3E3E",
    color: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnCancel: { backgroundColor: "#555" },
  btnConfirm: { backgroundColor: "#1DB954" },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 0.5, 
    borderColor: '#333' 
  }
});