import React, { useEffect, useState } from "react";
import { addEmigrant, getEmigrants, updateEmigrant, deleteEmigrant } from './services/emigrantsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

function App() {
  const [emigrants, setEmigrants] = useState([]);
  const [form, setForm] = useState({
    year: "",
    single: "",
    married: "",
    widower: "",
    separated: "",
    divorced: "",
    notReported: ""
  });

  // Fetch data
  const fetchData = async () => {
    const data = await getEmigrants();
    setEmigrants(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    await addEmigrant({
      year: Number(form.year) || 0,
      single: Number(form.single) || 0,
      married: Number(form.married) || 0,
      widower: Number(form.widower) || 0,
      separated: Number(form.separated) || 0,
      divorced: Number(form.divorced) || 0,
      notReported: Number(form.notReported) || 0
    });
    setForm({ year: "", single: "", married: "", widower: "", separated: "", divorced: "", notReported: "" });
    fetchData();
  };

  const handleDelete = async (id) => {
    await deleteEmigrant(id);
    fetchData();
  };

  const handleUpdate = async (id) => {
    const newYear = prompt("Enter new year:");
    if (newYear) {
      await updateEmigrant(id, { year: Number(newYear) });
      fetchData();
    }
  };

  // Compute totals for bar chart
  const totals = emigrants.reduce((acc, cur) => {
    acc.single += cur.single || 0;
    acc.married += cur.married || 0;
    acc.widower += cur.widower || 0;
    acc.separated += cur.separated || 0;
    acc.divorced += cur.divorced || 0;
    acc.notReported += cur.notReported || 0;
    return acc;
  }, { single: 0, married: 0, widower: 0, separated: 0, divorced: 0, notReported: 0 });

  const chartData = [
    { category: "Single", count: totals.single },
    { category: "Married", count: totals.married },
    { category: "Widower", count: totals.widower },
    { category: "Separated", count: totals.separated },
    { category: "Divorced", count: totals.divorced },
    { category: "Not Reported", count: totals.notReported },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h1>Filipino Emigrants CRUD</h1>

      <div>
        {Object.keys(form).map(key => (
          <input
            key={key}
            name={key}
            placeholder={key}
            value={form[key]}
            onChange={handleChange}
            style={{ margin: 5 }}
          />
        ))}
        <button onClick={handleAdd}>Add</button>
      </div>

      <h2>Records</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Year</th>
            <th>Single</th>
            <th>Married</th>
            <th>Widower</th>
            <th>Separated</th>
            <th>Divorced</th>
            <th>Not Reported</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {emigrants.map(e => (
            <tr key={e.id}>
              <td>{e.year || 0}</td>
              <td>{e.single || 0}</td>
              <td>{e.married || 0}</td>
              <td>{e.widower || 0}</td>
              <td>{e.separated || 0}</td>
              <td>{e.divorced || 0}</td>
              <td>{e.notReported || 0}</td>
              <td>
                <button onClick={() => handleUpdate(e.id)}>Update</button>
                <button onClick={() => handleDelete(e.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Total Emigrants by Category</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;
