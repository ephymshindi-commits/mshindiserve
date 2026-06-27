"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKES } from "@/lib/utils";

export type RevenueChartRow = {
  month: string;
  foodRevenue: number;
  roomRevenue: number;
  ticketRevenue: number;
};

type RevenueChartProps = {
  data: RevenueChartRow[];
};

const series = [
  { key: "foodRevenue", name: "Food & Bar", stroke: "#d97706", fill: "#f59e0b" },
  { key: "roomRevenue", name: "Rooms", stroke: "#0f766e", fill: "#14b8a6" },
  { key: "ticketRevenue", name: "Tickets", stroke: "#7e22ce", fill: "#a855f7" },
] as const;

function formatAxis(value: number) {
  if (value >= 100000000) return `KES ${Math.round(value / 100000000)}m`;
  if (value >= 100000) return `KES ${Math.round(value / 100000)}k`;
  return formatKES(value);
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <defs>
          {series.map((item) => (
            <linearGradient key={item.key} id={`${item.key}Gradient`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={item.fill} stopOpacity={0.22} />
              <stop offset="95%" stopColor={item.fill} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.16)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatAxis}
          width={78}
        />
        <Tooltip
          formatter={(value: number, name) => [formatKES(value), name]}
          labelStyle={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#fff",
            boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
          }}
          itemStyle={{ color: "#fff" }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "#71717a", paddingTop: 14 }}
        />
        {series.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stroke={item.stroke}
            strokeWidth={2}
            fill={`url(#${item.key}Gradient)`}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
