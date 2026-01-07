'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';

export interface BarDataPoint {
  [key: string]: number | string;
}

export interface BarChartProps<T extends BarDataPoint> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  horizontal?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
}

const defaultMargin = { top: 20, right: 20, bottom: 50, left: 60 };

function BarChartInner<T extends BarDataPoint>({
  data,
  xKey,
  yKey,
  color = 'hsl(var(--primary))',
  showGrid = true,
  showTooltip = true,
  margin = defaultMargin,
  width,
  height,
}: BarChartProps<T> & { width: number; height: number }) {
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip: show,
    hideTooltip,
  } = useTooltip<T>();

  // Bounds
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getX = (d: T) => String(d[xKey]);
  const getY = (d: T) => Number(d[yKey]);

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: data.map(getX),
        range: [0, innerWidth],
        padding: 0.3,
      }),
    [data, innerWidth]
  );

  const yScale = useMemo(() => {
    const yValues = data.map(getY);
    return scaleLinear<number>({
      domain: [0, Math.max(...yValues) * 1.1],
      range: [innerHeight, 0],
      nice: true,
    });
  }, [data, innerHeight]);

  if (innerWidth < 10 || innerHeight < 10) return null;

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          {showGrid && (
            <GridRows
              scale={yScale}
              width={innerWidth}
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              strokeDasharray="2,3"
            />
          )}

          {/* Bars */}
          {data.map((d, i) => {
            const xValue = getX(d);
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (yScale(getY(d)) ?? 0);
            const barX = xScale(xValue) ?? 0;
            const barY = innerHeight - barHeight;

            return (
              <Bar
                key={`bar-${i}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
                opacity={tooltipData === d ? 1 : 0.8}
                onMouseMove={(event: React.MouseEvent<SVGRectElement>) => {
                  if (!showTooltip) return;
                  const coords = localPoint(event);
                  show({
                    tooltipData: d,
                    tooltipLeft: (coords?.x ?? 0),
                    tooltipTop: barY + margin.top,
                  });
                }}
                onMouseLeave={() => hideTooltip()}
              />
            );
          })}

          {/* Axes */}
          <AxisLeft
            scale={yScale}
            stroke="hsl(var(--border))"
            tickStroke="hsl(var(--border))"
            tickLabelProps={{
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 10,
              fontFamily: 'var(--font-sans)',
              textAnchor: 'end',
              dy: '0.33em',
            }}
            numTicks={5}
          />
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            stroke="hsl(var(--border))"
            tickStroke="hsl(var(--border))"
            tickLabelProps={{
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 10,
              fontFamily: 'var(--font-sans)',
              textAnchor: 'middle',
              angle: -45,
              dy: 5,
            }}
          />
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop ?? 0}
          left={tooltipLeft ?? 0}
          style={{
            ...defaultStyles,
            backgroundColor: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        >
          <div className="font-medium">{getX(tooltipData)}</div>
          <div className="text-muted-foreground">
            {String(yKey)}: {getY(tooltipData).toLocaleString()}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function BarChart<T extends BarDataPoint>(props: BarChartProps<T>) {
  return (
    <ParentSize debounceTime={10}>
      {({ width, height }: { width: number; height: number }) => (
        <BarChartInner {...props} width={width} height={height} />
      )}
    </ParentSize>
  );
}
