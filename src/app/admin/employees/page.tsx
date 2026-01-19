"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('id');
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleAddEmployee = async () => {
    const name = prompt("Enter Employee Name:");
    if (!name) return;
    const pin = prompt(`Enter 4-digit PIN for ${name}:`);
    if (!pin) return;

    const { error } = await supabase.from('employees').insert({ name, pin_code: pin });
    if (error) alert("Error: " + error.message);
    else fetchEmployees();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this employee?")) return;
    await supabase.from('employees').delete().eq('id', id);
    fetchEmployees();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
        <button onClick={handleAddEmployee} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700">+ Add Employee</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{emp.name}</h3>
              <p className="text-gray-500 font-mono text-sm mt-1">PIN: ****</p>
              <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs font-bold text-gray-600 rounded uppercase">{emp.role}</span>
            </div>
            <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg font-bold">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}