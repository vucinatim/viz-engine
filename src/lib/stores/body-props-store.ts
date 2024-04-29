import { create } from "zustand";

interface BodyPropsStore {
  props: Object;
  setProps: (props: Object) => void;
}

const useBodyProps = create<BodyPropsStore>((set) => ({
  props: {},
  setProps: (props) => set({ props }),
}));

export default useBodyProps;
