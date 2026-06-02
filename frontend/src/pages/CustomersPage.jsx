import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", email: "", phone: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => api.listCustomers().then(setCustomers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    try {
      await api.createCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      setForm(EMPTY);
      setNotice("Customer created.");
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await api.deleteCustomer(c.id); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-head"><h2>Customers</h2></div>
      {error && <div className="banner error">{error}</div>}
      {notice && <div className="banner success">{notice}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add customer</h3>
        <form className="grid" onSubmit={submit}>
          <div><label>Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Email *</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone || <span className="muted">—</span>}</td>
                <td className="right"><button className="btn-danger" onClick={() => remove(c)}>Delete</button></td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan="5" className="empty">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
