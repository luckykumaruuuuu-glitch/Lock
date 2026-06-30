import { KeyboardProvider } from "react-native-keyboard-controller";
import React, { Component } from "react";

type Props = { children: React.ReactNode };
type State = { crashed: boolean };

export class SafeKeyboardProvider extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) {
      return <>{this.props.children}</>;
    }
    return <KeyboardProvider>{this.props.children}</KeyboardProvider>;
  }
}
