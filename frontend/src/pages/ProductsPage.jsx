import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { sku: "", name: "", description: "", price: "", stock: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => api.listProducts().then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    try {
      await api.createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock || 0),
      });
      setForm(EMPTY);
      setNotice("Product created.");
      load();
    } catch (e) { setError(e.message); }
  };

  const restock = async (p) => {
    const amount = prompt(`Add stock for "${p.name}". Quantity to add:`, "10");
    if (amount === null) return;
    try {
      await api.updateProduct(p.id, { stock: p.stock + Number(amount) });
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try { await api.deleteProduct(p.id); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-head"><h2>Products</h2></div>
      {error && <div className="banner error">{error}</div>}
      {notice && <div className="banner success">{notice}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add product</h3>
        <form className="grid" onSubmit={submit}>
          <div><label>SKU *</label><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><label>Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label>Price *</label><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><label>Stock</label><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}<div className="muted" style={{ fontSize: "0.8rem" }}>{p.description}</div></td>
                <td>${Number(p.price).toFixed(2)}</td>
                <td>{p.stock}</td>
                <td><span className={`badge ${p.stock > 0 ? "ok" : "out"}`}>{p.stock > 0 ? "In stock" : "Out of stock"}</span></td>
                <td className="right">
                  <button className="btn-ghost" onClick={() => restock(p)}>Restock</button>{" "}
                  <button className="btn-danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan="6" className="empty">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
