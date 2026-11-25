import Svg, { Circle, Path, Polygon } from 'react-native-svg';

type P = { size?: number; color?: string; filled?: boolean; strokeWidth?: number };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export const CheckIcon = ({ size = 16, color = '#fff', strokeWidth = 3 }: P) => (
  <Svg {...base(size)}>
    <Path d="M5 12.5l4.2 4.2L19 7" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = '#fff', strokeWidth = 2.6 }: P) => (
  <Svg {...base(size)}>
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const StarIcon = ({ size = 18, color = '#fff', filled }: P) => (
  <Svg {...base(size)}>
    <Polygon
      points="12,3 14.8,9 21.3,9.6 16.4,14 17.8,20.4 12,17.1 6.2,20.4 7.6,14 2.7,9.6 9.2,9"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export const BoltIcon = ({ size = 12, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color} />
  </Svg>
);

export const FlameIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path
      d="M12 2.5c.6 3.2 4.8 5.4 4.8 10.6A4.8 4.8 0 0 1 12 18a4.8 4.8 0 0 1-4.8-4.9c0-2.6 1.6-3.9 2.1-6.4 1.3 1 2 2.4 2.1 3.9 1-1.9 1.2-5.3.6-8.1z"
      fill={color}
    />
    <Path d="M12 21.5a3 3 0 0 1-3-3c0-1.6 1.5-2.4 1.7-3.8.9.7 1.3 1.6 1.3 2.4.6-.6.9-1.6.8-2.6 1.3 1 2.2 2.4 2.2 4a3 3 0 0 1-3 3z" fill={color} opacity={0.55} />
  </Svg>
);

export const PhoneIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path
      d="M5 4h3.5l1.8 4.6-2.2 1.4a11 11 0 0 0 5.9 5.9l1.4-2.2 4.6 1.8V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinejoin="round"
    />
  </Svg>
);

export const CartIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6.4" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={9} cy={19.2} r={1.6} fill={color} />
    <Circle cx={16.8} cy={19.2} r={1.6} fill={color} />
  </Svg>
);

export const ListIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M9 6.5h11M9 12h11M9 17.5h11" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    <Circle cx={4.6} cy={6.5} r={1.4} fill={color} />
    <Circle cx={4.6} cy={12} r={1.4} fill={color} />
    <Circle cx={4.6} cy={17.5} r={1.4} fill={color} />
  </Svg>
);

export const LinkIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const SparkleIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    <Path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill={color} />
  </Svg>
);

export const BookIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    <Path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
  </Svg>
);

export const BriefcaseIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M3.5 8.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    <Path d="M9 8.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2.5M3.5 13h17" fill="none" stroke={color} strokeWidth={1.9} />
  </Svg>
);

export const FlipIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PinIcon =({ size = 14, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" fill={color} />
    <Path d="M12 14v7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CloseIcon = ({ size = 16, color = '#fff', strokeWidth = 2.4 }: P) => (
  <Svg {...base(size)}>
    <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const PencilIcon = ({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
    <Path d="M13.5 6.5l4 4" stroke={color} strokeWidth={1.9} />
  </Svg>
);

export const TrashIcon =({ size = 18, color = '#fff' }: P) => (
  <Svg {...base(size)}>
    <Path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
