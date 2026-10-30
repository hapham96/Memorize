'use client';

import React, { useId } from 'react';

/**
 * Memori drawn as SVG parts — ears, face, trunk, cap, body, arms — so each
 * mood is just a pose: an expression, where the arms are, and a little
 * effect. Motion is CSS (keyframes in globals.css), so it costs nothing to
 * ship and turns off with the mascot-animation setting.
 */

/**
 * Arm angle in degrees around the shoulder (0 hangs straight down, clockwise
 * is positive) and reach to the paw centre. Short at rest so the paws sit at
 * the hips — long arms there read as a second pair of legs.
 */
const ARM = {
  rest: { angle: 34, length: 34 },
  low: { angle: -14, length: 34 }, // limp, paws in front of the belly
  fist: { angle: 118, length: 40 }, // raised to the side, "you can do it"
  peek: { angle: 142, length: 46 }, // beside the face, below the eye
  wave: { angle: 150, length: 44 },
  up: { angle: 162, length: 46 },
  cheek: { angle: 160, length: 48 },
  cover: { angle: 193, length: 60 }, // paw over the eye
} as const;

export type ArmPose = keyof typeof ARM;

export interface MemoriPose {
  eyes: 'open' | 'happy' | 'closed';
  brows: 'none' | 'calm' | 'sad' | 'angry';
  mouth: 'smile' | 'grin' | 'o' | 'frown' | 'wavy' | 'flat';
  /** Viewer's left arm, viewer's right arm. */
  arms: [ArmPose, ArmPose];
  /** Extra degrees on both arms, mirrored — slides covering paws sideways. */
  armNudge?: number;
  /** The right arm waves. */
  waving?: boolean;
  ears?: 'up' | 'droop';
  /** -1…1 on each axis. */
  glance?: { x: number; y: number };
  trunk?: number;
  tilt?: number;
  extra?: 'zzz' | 'dots' | 'sweat' | 'tear' | 'sparkles';
  motion?: 'bob' | 'hop' | 'shake' | 'breathe' | 'nod' | 'bounce';
}

const BLUE = '#a8d4f5';
const BLUE_LIGHT = '#c6e3fb';
const BLUE_SHADE = '#8cc0ea';
const EAR_INNER = '#e2b9e8';
const CAP = '#f5d365';
const CAP_SHADE = '#e0b543';
const EYE = '#1f2a44';
const MOUTH = '#b4374a';
const LINE = '#7a3340';
const TOE = '#f3e6d3';
const PAD = '#c9cbe9';

const SHOULDER = { x: 68, y: 140 };
const EYES_X = [82, 118];
const EYE_Y = 82;

interface MemoriSvgProps {
  pose: MemoriPose;
  size: number;
  animated: boolean;
  /** Head and cap only — reads better at icon sizes. */
  headOnly?: boolean;
  /** Round avatar backdrop that clips the figure (login screen). */
  framed?: boolean;
  label: string;
  className?: string;
}

export const MemoriSvg: React.FC<MemoriSvgProps> = ({
  pose,
  size,
  animated,
  headOnly = false,
  framed = false,
  label,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const ease = animated ? 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)' : 'none';
  // CSS transforms on SVG parts: lengths are viewBox units, and the origin is
  // given explicitly in those units too.
  const part = (transform: string, origin = '0 0'): React.CSSProperties => ({
    transform,
    transformBox: 'view-box',
    transformOrigin: origin,
    transition: ease,
  });
  const anim = (name: string | undefined) => (animated && name ? `memori-${name}` : undefined);

  const gx = (pose.glance?.x ?? 0) * 6;
  const gy = (pose.glance?.y ?? 0) * 4;
  const droop = pose.ears === 'droop';
  const nudge = pose.armNudge ?? 0;

  const brow = (side: -1 | 1) => {
    const outer = 100 + side * 28;
    const inner = 100 + side * 12;
    // Sad lifts the inner ends, angry drops them; both pivot on the outer end.
    const turn = pose.brows === 'sad' ? -14 : pose.brows === 'angry' ? 16 : 0;
    return (
      <path
        key={side}
        d={`M${outer},66 Q${(outer + inner) / 2},62 ${inner},66`}
        style={part(`rotate(${side === -1 ? turn : -turn}deg)`, `${outer}px 66px`)}
      />
    );
  };

  const eye = (cx: number) => {
    if (pose.eyes === 'happy') {
      return <path key={cx} d={`M${cx - 9},${EYE_Y + 3} Q${cx},${EYE_Y - 9} ${cx + 9},${EYE_Y + 3}`} stroke={EYE} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    }
    if (pose.eyes === 'closed') {
      return <path key={cx} d={`M${cx - 9},${EYE_Y} Q${cx},${EYE_Y + 7} ${cx + 9},${EYE_Y}`} stroke={EYE} strokeWidth="3" strokeLinecap="round" fill="none" />;
    }
    return (
      <g key={cx} className={anim('blink')}>
        <ellipse cx={cx} cy={EYE_Y} rx="10.5" ry="12.5" fill={EYE} />
        <circle cx={cx - 3.5} cy={EYE_Y - 4.5} r="3.8" fill="#fff" />
        <circle cx={cx + 3} cy={EYE_Y + 5} r="1.7" fill="#fff" opacity="0.85" />
      </g>
    );
  };

  const mouth = {
    smile: <path d="M78,110 Q86,118 94,111" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    grin: <path d="M77,108 Q86,124 95,109 Z" fill={MOUTH} />,
    o: <ellipse cx="86" cy="113" rx="4.5" ry="4" fill={MOUTH} />,
    frown: <path d="M79,117 Q86,110 93,117" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    wavy: <path d="M77,114 q3,-3 5,0 t5,0 t5,0" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
    flat: <path d="M79,113 L93,113" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />,
  }[pose.mouth];

  const arm = (side: 'left' | 'right') => {
    const left = side === 'left';
    const { angle: base, length } = ARM[pose.arms[left ? 0 : 1]];
    const angle = left ? base + nudge : base - nudge;
    const x = left ? SHOULDER.x : 200 - SHOULDER.x;
    // The reach changes between poses, so the arm is a round shoulder, a
    // plain rect stretched with scaleY (no rounded corners to distort) and
    // the paw slid out to its end — all transforms, so it all glides.
    const drawing = (
      <>
        <circle r="12" fill={BLUE_SHADE} />
        <rect x="-12" y="0" width="24" height="1" fill={BLUE_SHADE} style={part(`scaleY(${length})`)} />
        <g style={part(`translate(0px, ${length}px)`)}>
          <circle r="15" fill={BLUE} />
          <ellipse cy="-1" rx="6.5" ry="6" fill={PAD} />
          <circle cx="-8.5" cy="9" r="3.6" fill={TOE} />
          <circle cx="0" cy="12" r="3.6" fill={TOE} />
          <circle cx="8.5" cy="9" r="3.6" fill={TOE} />
        </g>
      </>
    );
    return (
      <g key={side} style={part(`translate(${x}px, ${SHOULDER.y}px) rotate(${left ? angle : -angle}deg)`)}>
        {!left && pose.waving ? <g className={anim('waving')} style={{ transformBox: 'view-box', transformOrigin: '0 0' }}>{drawing}</g> : drawing}
      </g>
    );
  };

  const figure = (
    <g className={anim(pose.motion)}>
      {/* Body and feet */}
      {!headOnly && (
        <g>
          <ellipse cx="80" cy="192" rx="15" ry="9" fill={BLUE_SHADE} />
          <ellipse cx="120" cy="192" rx="15" ry="9" fill={BLUE_SHADE} />
          <ellipse cx="100" cy="158" rx="45" ry="37" fill={BLUE} />
          <ellipse cx="100" cy="163" rx="26" ry="22" fill={BLUE_LIGHT} opacity="0.7" />
        </g>
      )}

      {/* Head, tilting from the neck */}
      <g style={part(`rotate(${pose.tilt ?? 0}deg)`, '100px 140px')}>
        {[-1, 1].map((dir) => {
          const cx = 100 + dir * 56;
          return (
            <g key={dir} style={part(`rotate(${droop ? dir * 16 : 0}deg)`, `${100 + dir * 38}px 76px`)}>
              <ellipse cx={cx} cy="88" rx="31" ry="37" fill={BLUE_SHADE} />
              <ellipse cx={cx - dir * 3} cy="90" rx="20" ry="26" fill={EAR_INNER} />
            </g>
          );
        })}
        <ellipse cx="100" cy="92" rx="54" ry="50" fill={`url(#${uid}-head)`} />
        <ellipse cx="70" cy="104" rx="9" ry="5" fill="#f9a8d4" opacity="0.5" />
        <ellipse cx="130" cy="104" rx="9" ry="5" fill="#f9a8d4" opacity="0.5" />

        {pose.brows !== 'none' && (
          <g stroke={BLUE_SHADE} strokeWidth="3" strokeLinecap="round" fill="none">
            {brow(-1)}
            {brow(1)}
          </g>
        )}

        <g style={part(`translate(${gx}px, ${gy}px)`)}>{EYES_X.map(eye)}</g>

        {mouth}

        <g style={part(`rotate(${pose.trunk ?? 0}deg)`, '100px 88px')}>
          <path d="M100,88 C100,104 98,116 104,124 C109,130 118,128 120,120" stroke={BLUE_SHADE} strokeWidth="17" strokeLinecap="round" fill="none" />
          <path d="M100,88 C100,104 98,116 104,124 C109,130 118,128 120,120" stroke={BLUE} strokeWidth="12" strokeLinecap="round" fill="none" />
        </g>

        <g transform="rotate(8 100 40)">
          <path d="M78,40 L122,40 L120,54 Q100,60 80,54 Z" fill={CAP_SHADE} />
          <path d="M100,22 L148,36 L100,50 L52,36 Z" fill={CAP} />
          <path d="M100,36 L140,40 L141,58" stroke={CAP_SHADE} strokeWidth="2" fill="none" />
          <ellipse cx="141" cy="61" rx="3.5" ry="5" fill={CAP_SHADE} />
        </g>

        {pose.extra === 'tear' && <path d="M76,96 q-5,8 0,11 q5,-3 0,-11z" fill="#7dd3fc" />}
        {pose.extra === 'sweat' && <path d="M150,52 q-6,9 0,12 q6,-3 0,-12z" fill="#7dd3fc" className={anim('drip')} />}
      </g>

      {!headOnly && (
        <>
          {arm('left')}
          {arm('right')}
        </>
      )}

      {pose.extra === 'zzz' && (
        <g fill="#60a5fa" fontWeight="800" fontFamily="sans-serif">
          <text x="146" y="44" fontSize="13" className={anim('zzz')}>z</text>
          <text x="158" y="30" fontSize="17" className={anim('zzz')} style={{ animationDelay: '0.6s' }}>z</text>
          <text x="172" y="14" fontSize="21" className={anim('zzz')} style={{ animationDelay: '1.2s' }}>Z</text>
        </g>
      )}
      {pose.extra === 'dots' && (
        <g fill="#93c5fd">
          {[150, 162, 174].map((cx, i) => (
            <circle key={cx} cx={cx} cy="26" r="4" className={anim('dot')} style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </g>
      )}
      {pose.extra === 'sparkles' && (
        <g fill="#fbbf24">
          {[
            [26, 46, 1],
            [174, 52, 0.8],
            [20, 124, 0.7],
            [180, 128, 1],
          ].map(([cx, cy, s], i) => (
            <path
              key={i}
              d={`M${cx},${cy - 9 * s} Q${cx},${cy} ${cx + 9 * s},${cy} Q${cx},${cy} ${cx},${cy + 9 * s} Q${cx},${cy} ${cx - 9 * s},${cy} Q${cx},${cy} ${cx},${cy - 9 * s}Z`}
              className={anim('twinkle')}
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </g>
      )}
    </g>
  );

  return (
    <svg
      viewBox={headOnly ? '12 14 176 136' : '0 0 200 200'}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <radialGradient id={`${uid}-head`} cx="40%" cy="32%" r="75%">
          <stop offset="0%" stopColor={BLUE_LIGHT} />
          <stop offset="100%" stopColor={BLUE} />
        </radialGradient>
        {framed && (
          <clipPath id={`${uid}-frame`}>
            <circle cx="100" cy="100" r="94" />
          </clipPath>
        )}
      </defs>
      {framed ? (
        <>
          <circle cx="100" cy="100" r="96" className="fill-blue-100 dark:fill-slate-800" />
          <g clipPath={`url(#${uid}-frame)`}>{figure}</g>
          <circle cx="100" cy="100" r="95" fill="none" strokeWidth="3" className="stroke-blue-200 dark:stroke-slate-700" />
        </>
      ) : (
        figure
      )}
    </svg>
  );
};
