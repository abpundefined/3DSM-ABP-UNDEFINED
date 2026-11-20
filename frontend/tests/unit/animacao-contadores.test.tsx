import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnimatedMetricValue from '../../src/components/common/AnimatedMetricValue';
import useFlipList from '../../src/hooks/useFlipList';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('AnimatedMetricValue', () => {
  let callbacks: FrameRequestCallback[] = [];
  let frameId = 0;

  beforeEach(() => {
    callbacks = [];
    frameId = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        callbacks.push(cb);
        frameId += 1;
        return frameId;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('anima visualmente até o valor final mantendo apenas o valor final para leitores de tela', () => {
    mockReducedMotion(false);
    const { container } = render(
      <AnimatedMetricValue value="100,00 kWh" withUnit durationMs={500} />,
    );

    // Durante a animação, leitores de tela recebem somente o valor final via sr-only.
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toHaveTextContent('100,00 kWh');
    const visualNumber = container.querySelector('[aria-hidden="true"]');
    expect(visualNumber).toHaveTextContent('0,00');

    // Avança para metade do tempo (250 ms)
    act(() => {
      const cb = callbacks.shift();
      cb?.(1000);
    });
    act(() => {
      const cb = callbacks.shift();
      cb?.(1250);
    });
    expect(container.querySelector('.sr-only')).toHaveTextContent('100,00 kWh');
    expect(
      container.querySelector('[aria-hidden="true"]')?.textContent,
    ).not.toBe('0,00');
    expect(
      container.querySelector('[aria-hidden="true"]')?.textContent,
    ).not.toBe('100,00');

    // Conclui em 500 ms (<= 600 ms)
    act(() => {
      const cb = callbacks.shift();
      cb?.(1500);
    });
    expect(container.querySelector('.sr-only')).toBeNull();
    expect(screen.getByText('100,00')).toBeVisible();
    expect(screen.getByText('kWh')).toBeVisible();
  });

  it('desliga completamente a animação quando prefers-reduced-motion está ativo', () => {
    mockReducedMotion(true);
    render(<AnimatedMetricValue value="2,50 kWh" withUnit />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(screen.getByText('2,50')).toBeVisible();
    expect(screen.getByText('kWh')).toBeVisible();
  });
});

function FlipTestList({
  items,
  rectMap,
}: {
  items: string[];
  rectMap: Record<string, { left: number; top: number }>;
}) {
  const ref = useFlipList<HTMLUListElement>(items.join(','));
  return (
    <ul ref={ref}>
      {items.map((id) => (
        <li
          key={id}
          data-flip-id={id}
          ref={(el) => {
            if (!el) return;
            const pos = rectMap[id] ?? { left: 0, top: 0 };
            el.getBoundingClientRect = () =>
              ({
                left: pos.left,
                top: pos.top,
                right: pos.left + 100,
                bottom: pos.top + 40,
                width: 100,
                height: 40,
                x: pos.left,
                y: pos.top,
                toJSON: () => ({}),
              }) as DOMRect;
          }}
        >
          {id}
        </li>
      ))}
    </ul>
  );
}

describe('useFlipList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aplica transição FLIP ao reordenar e desliga com prefers-reduced-motion', () => {
    const animateMock = vi.fn();
    HTMLElement.prototype.animate = animateMock;

    mockReducedMotion(false);
    const { rerender } = render(
      <FlipTestList
        items={['a', 'b']}
        rectMap={{ a: { left: 0, top: 0 }, b: { left: 0, top: 50 } }}
      />,
    );
    expect(animateMock).not.toHaveBeenCalled();

    rerender(
      <FlipTestList
        items={['b', 'a']}
        rectMap={{ b: { left: 0, top: 0 }, a: { left: 0, top: 50 } }}
      />,
    );
    expect(animateMock).toHaveBeenCalledTimes(2);
    expect(animateMock).toHaveBeenCalledWith(
      [{ transform: 'translate(0px, 50px)' }, { transform: 'translate(0, 0)' }],
      expect.objectContaining({ duration: 260 }),
    );

    animateMock.mockClear();
    mockReducedMotion(true);
    rerender(
      <FlipTestList
        items={['a', 'b']}
        rectMap={{ a: { left: 0, top: 0 }, b: { left: 0, top: 50 } }}
      />,
    );
    expect(animateMock).not.toHaveBeenCalled();
  });
});
