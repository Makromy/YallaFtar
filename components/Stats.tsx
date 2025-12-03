import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Session, OrderStatus, AggregatedItem } from '../types';

interface StatsProps {
  session: Session;
  aggregatedItems: AggregatedItem[];
}

const COLORS = ['#fbbf24', '#4ade80', '#60a5fa', '#f87171'];

export const Stats: React.FC<StatsProps> = ({ session, aggregatedItems }) => {
  // Prepare data for Status Bar Chart
  const statusData = [
    { name: 'Pending', value: session.orders.filter(o => o.status === OrderStatus.PENDING).length },
    { name: 'Confirmed', value: session.orders.filter(o => o.status === OrderStatus.CONFIRMED).length },
    { name: 'Completed', value: session.orders.filter(o => o.status === OrderStatus.COMPLETED).length },
  ];

  // Prepare data for Items Pie Chart (Top 5 items)
  const itemData = aggregatedItems
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => ({ name: item.name, value: item.count }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Order Status</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#facc15' : index === 1 ? '#4ade80' : '#60a5fa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Top Items</h3>
        <div className="h-48 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={itemData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {itemData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize: '12px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};