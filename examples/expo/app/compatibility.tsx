import {
  Children,
  cloneElement,
  createElement,
  forwardRef,
  useRef,
  useState,
  type ReactElement,
  type ComponentProps,
} from 'react';
import {Link} from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import {breakpoints, useBreakpointStyle} from '@react-native-media-styles/core';

const responsive = breakpoints<ViewStyle>({
  base: {paddingLeft: 17},
  '(min-width: 800px)': {paddingLeft: 43},
});
const ordinary = StyleSheet.create({box: {paddingLeft: 91}});

function Slot({children}: {children: ReactElement<{testID?: string}>}) {
  return cloneElement(Children.only(children), {testID: 'cloned-child'});
}

const Button = forwardRef<View, ComponentProps<typeof Pressable>>(
  function Button(props, ref) {
    const style = useBreakpointStyle(responsive);
    return <Pressable {...props} ref={ref} style={[ordinary.box, style]} />;
  },
);

// This component uses Babel companions with ordinary React DOM elements.
const DOMButton = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  function DOMButton(props, ref) {
    const style = useBreakpointStyle(responsive);
    const className = Object.values(Object(style))
      .filter((value) => typeof value === 'string')
      .join(' ');
    return (
      <button {...props} ref={ref} className={className}>
        DOM button
      </button>
    );
  },
);

// The public RNW factory must retain its element type for SVG and cloning.
// These calls contain no responsive hooks and exercise Metro independently.
function FactoryProbe() {
  const factory: typeof createElement =
    require('react-native-web').unstable_createElement;
  const anchor = cloneElement(
    factory('a', {href: '/details', children: 'factory'}),
    {id: 'factory-cloned'},
  );
  return (
    <>
      {anchor}
      {factory('svg', {
        width: 20,
        height: 20,
        children: factory('defs', {
          children: factory('linearGradient', {id: 'gradient'}),
        }),
      })}
    </>
  );
}

export default function Compatibility() {
  const input = useRef<TextInput>(null);
  const [clicks, setClicks] = useState(0);
  const [focused, setFocused] = useState(false);
  const dom = useRef<HTMLButtonElement>(null);
  return (
    <View>
      <Text testID="compatibility-state">
        {clicks}:{String(focused)}
      </Text>
      <Slot>
        <Button onPress={() => setClicks((value) => value + 1)}>
          <Text>Clone</Text>
        </Button>
      </Slot>
      {Platform.OS === 'web' && (
        <>
          <DOMButton
            ref={dom}
            data-testid="babel-only"
            onClick={() => setClicks((value) => value + 1)}
          />
          <FactoryProbe />
          <Pressable testID="focus-dom" onPress={() => dom.current?.focus()}>
            <Text>Focus DOM</Text>
          </Pressable>
        </>
      )}
      <Link href="/details" asChild>
        <Button testID="as-child">
          <Text>Details</Text>
        </Button>
      </Link>
      <TextInput
        ref={input}
        testID="ref-input"
        onFocus={() => setFocused(true)}
      />
      <Pressable testID="focus-input" onPress={() => input.current?.focus()}>
        <Text>Focus input</Text>
      </Pressable>
      <Pressable testID="render-prop">
        {({pressed}) => <Text>{pressed ? 'Pressed' : 'Idle'}</Text>}
      </Pressable>
      <View
        testID="ordinary-first"
        style={[ordinary.box, useBreakpointStyle(responsive)]}
      />
      <View
        testID="responsive-first"
        style={[useBreakpointStyle(responsive), ordinary.box]}
      />
      <View
        testID="inline-wins"
        style={[useBreakpointStyle(responsive), {paddingLeft: 67}]}
      />
    </View>
  );
}
