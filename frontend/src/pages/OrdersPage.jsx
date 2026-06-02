import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    api.listOrders().then(setOrders).catch((e) => setError(e.message));
    api.listProducts().then(setProducts).catch((e) => setError(e.message));
    api.listCustomers().then(setCustomers).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  const productName = (id) => products.find((p) => p.id === id)?.name || `#${id}`;
  const customerName = (id) => customers.find((c) => c.id === id)?.name || `#${id}`;

  const setLine = (i, patch) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines([...lines, { product_id: "", quantity: 1 }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const estTotal = lines.reduce((sum, l) => {
    const p = products.find((x) => x.id === Number(l.product_id));
    return p ? sum + Number(p.price) * Number(l.quantity || 0) : sum;
  }, 0);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    if (!customerId) return setError("Select a customer.");
    if (items.length === 0) return setError("Add at least one product line.");
    try {
      const order = await api.createOrder({ customer_id: Number(customerId), items });
      setNotice(`Order #${order.id} placed — total $${Number(order.total_amount).toFixed(2)}.`);
      setCustomerId("");
      setLines([{ product_id: "", quantity: 1 }]);
      load();
    } catch (e) { setError(e.message); }
  };

  const cancel = async (o) => {
    if (!confirm(`Cancel order #${o.id}? Stock will be returned.`)) return;
    setError(""); setNotice("");
    try {
      await api.deleteOrder(o.id);
      setNotice(`Order #${o.id} cancelled.`);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-head"><h2>Orders</h2></div>
      {error && <div className="banner error">{error}</div>}
      {notice && <div className="banner success">{notice}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Place an order</h3>
        <form onSubmit={submit}>
          <div style={{ maxWidth: 320, marginBottom: 14 }}>
            <label>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— select customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>

          <label>Items *</label>
          {lines.map((line, i) => (
            <div className="line-row" key={i}>
              <select value={line.product_id} onChange={(e) => setLine(i, { product_id: e.target.value })}>
                <option value="">— select product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} — ${Number(p.price).toFixed(2)} ({p.stock} in stock)
                  </option>
                ))}
              </select>
              <input type="number" min="1" value={line.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              {lines.length > 1
                ? <button type="button" className="btn-danger" onClick={() => removeLine(i)}>✕</button>
                : <span />}
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={addLine}>+ Add line</button>
            <span className="spacer" />
            <strong>Est. total: ${estTotal.toFixed(2)}</strong>
            <button className="btn-primary" type="submit">Place order</button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Placed</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{customerName(o.customer_id)}</td>
                <td>{o.items.map((it) => `${productName(it.product_id)} ×${it.quantity}`).join(", ")}</td>
                <td>${Number(o.total_amount).toFixed(2)}</td>
                <td><span className="badge ok">{o.status}</span></td>
                <td className="muted">{new Date(o.created_at).toLocaleString()}</td>
                <td className="right"><button className="btn-danger" onClick={() => cancel(o)}>Cancel</button></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="7" className="empty">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
