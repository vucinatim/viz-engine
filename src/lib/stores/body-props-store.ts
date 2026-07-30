import { create } from 'zustand';

interface BodyPropsStore {
  props: object;
  setProps: (props: object) => void;
}

const useBodyProps = create<BodyPropsStore>((set) => ({
  props: {},
  setProps: (props) => set({ props }),
}));

export default useBodyProps;
