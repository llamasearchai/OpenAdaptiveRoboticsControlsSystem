'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { bisector } from 'd3-array';

export interface DataPoint {
  [key: string]: number | string | Date;
}

export interface LineChartProps<T extends DataPoint> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color?: string;
  showArea?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  margin?: { top: number; right: number; bottom: number; left: number };
}

const defaultMargin = { top: 20, right: 20, bottom: 40, left: 50 };

function LineChartInner<T extends DataPoint>({
  data,
  xKey,
  yKey,
  color = 'hsl(var(--primary))',
  showArea = true,
  showGrid = true,
  showTooltip = true,
  margin = defaultMargin,
  width,
  height,
}: LineChartProps<T> & { width: number; height: number }) {
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
  const getX = (d: T) => d[xKey] as number;
  const getY = (d: T) => d[yKey] as number;

  // Scales
  const xScale = useMemo(() => {
    const xValues = data.map(getX);
    return scaleLinear({
      domain: [Math.min(...xValues), Math.max(...xValues)],
      range: [0, innerWidth],
    });
  }, [data, innerWidth]);

  const yScale = useMemo(() => {
    const yValues = data.map(getY);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const padding = (maxY - minY) * 0.1;
    return scaleLinear({
      domain: [Math.max(0, minY - padding), maxY + padding],
      range: [innerHeight, 0],
      nice: true,
    });
  }, [data, innerHeight]);

  // Tooltip handler
  const handleTooltip = React.useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      if (!showTooltip) return;

      const { x } = localPoint(event) ?? { x: 0 };
      const x0 = xScale.invert(x - margin.left);

      const bisect = bisector<T, number>((d: T) => getX(d)).left;
      const index = bisect(data, x0, 1);
      const d0 = data[index - 1];
      const d1 = data[index];

      let d = d0;
      if (d0 === undefined) return;
      if (d1 !== undefined && getX(d1)) {
        d = x0 - getX(d0) > getX(d1) - x0 ? d1 : d0;
      }

      if (d !== undefined) {
        show({
          tooltipData: d,
          tooltipLeft: xScale(getX(d)) + margin.left,
          tooltipTop: yScale(getY(d)) + margin.top,
        });
      }
    },
    [data, margin, showTooltip, xScale, yScale, show]
  );

  if (innerWidth < 10 || innerHeight < 10) return null;

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient
          id="area-gradient"
          from={color}
          to={color}
          fromOpacity={0.3}
          toOpacity={0}
        />

        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          {showGrid && (
            <>
              <GridRows
                scale={yScale}
                width={innerWidth}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                strokeDasharray="2,3"
              />
              <GridColumns
                scale={xScale}
                height={innerHeight}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                strokeDasharray="2,3"
              />
            </>
          )}

          {/* Area */}
          {showArea && (
            <AreaClosed<T>
              data={data}
              x={(d: T) => xScale(getX(d))}
              y={(d: T) => yScale(getY(d))}
              yScale={yScale}
              fill="url(#area-gradient)"
              curve={curveMonotoneX}
            />
          )}

          {/* Line */}
          <LinePath<T>
            data={data}
            x={(d: T) => xScale(getX(d))}
            y={(d: T) => yScale(getY(d))}
            stroke={color}
            strokeWidth={2}
            curve={curveMonotoneX}
          />

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
            }}
            numTicks={Math.min(10, data.length)}
            tickFormat={(value: number | { valueOf(): number }) => {
              const num = Number(value);
              if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
              if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
              return String(value);
            }}
          />

          {/* Tooltip overlay */}
          {showTooltip && (
            <rect
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onTouchStart={handleTooltip}
              onTouchMove={handleTooltip}
              onMouseMove={handleTooltip}
              onMouseLeave={() => hideTooltip()}
            />
          )}

          {/* Tooltip indicator */}
          {tooltipOpen && tooltipData && (
            <>
              <circle
                cx={xScale(getX(tooltipData))}
                cy={yScale(getY(tooltipData))}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
              <line
                x1={xScale(getX(tooltipData))}
                x2={xScale(getX(tooltipData))}
                y1={0}
                y2={innerHeight}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.3}
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            </>
          )}
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
          <div className="font-medium">
            {String(xKey)}: {getX(tooltipData).toLocaleString()}
          </div>
          <div className="text-muted-foreground">
            {String(yKey)}: {getY(tooltipData).toFixed(4)}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function LineChart<T extends DataPoint>(props: LineChartProps<T>) {
  return (
    <ParentSize debounceTime={10}>
      {({ width, height }: { width: number; height: number }) => (
        <LineChartInner {...props} width={width} height={height} />
      )}
    </ParentSize>
  );
}
