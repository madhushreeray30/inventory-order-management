import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="banner error">{error}</div>;
  if (!stats) return <p className="muted">Loading…</p>;

  const cards = [
    { label: "Total Products", value: stats.total_products },
    { label: "Total Customers", value: stats.total_customers },
    { label: "Total Orders", value: stats.total_orders },
    { label: "Low Stock", value: stats.low_stock_count },
  ];

  return (
    <div>
      <div className="page-head"><h2>Dashboard</h2></div>

      <div className="stats-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Low stock products</h3>
        {stats.low_stock_products.length === 0 ? (
          <p className="muted">All products are well stocked.</p>
        ) : (
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>Stock</th></tr></thead>
            <tbody>
              {stats.low_stock_products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td><span className={`badge ${p.stock > 0 ? "ok" : "out"}`}>{p.stock}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
