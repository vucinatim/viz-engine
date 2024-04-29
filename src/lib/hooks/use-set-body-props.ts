import { useEffect } from "react";
import useBodyProps from "../stores/body-props-store";

const useSetBodyProps = (props: Object) => {
  const { setProps } = useBodyProps();
  useEffect(() => {
    setProps(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProps]);
};

export default useSetBodyProps;
