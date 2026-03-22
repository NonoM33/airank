'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  score: number
}

interface Props {
  data: DataPoint[]
}

export function EvolutionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        Lancez vos premiers scans pour voir l&apos;évolution ici
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#A1A1AA"
          tick={{ fontSize: 11, fill: '#A1A1AA' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          stroke="#A1A1AA"
          tick={{ fontSize: 11, fill: '#A1A1AA' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#141416',
            border: '1px solid #27272A',
            borderRadius: '8px',
            color: '#FAFAFA',
            fontSize: 12,
          }}
          itemStyle={{ color: '#6366F1' }}
          labelStyle={{ color: '#A1A1AA', marginBottom: 4 }}
          formatter={(value) => [`${value}/100`, 'Score']}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#6366F1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
