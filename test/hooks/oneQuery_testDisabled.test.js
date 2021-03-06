import { React, mount, ClientMock, setDefaultClient, GraphQL, useQuery } from "../testSuiteInitialize";
import {
  verifyPropsFor,
  deferred,
  resolveDeferred,
  loadingPacket,
  defaultPacket,
  dataPacket,
  errorPacket,
  rejectDeferred,
  pause
} from "../testUtils";

const queryA = "A";
const queryB = "B";

let client1;

beforeEach(() => {
  client1 = new ClientMock("endpoint1");
  setDefaultClient(client1);
});

const Dummy = () => <div />;

function ComponentToUse(props) {
  let queryProps = useQuery([queryA, { a: props.a }, { active: props.active }]);
  return <Dummy {...queryProps} />;
}

test("loading props passed", async () => {
  let wrapper = mount(<ComponentToUse a={1} unused={0} active={false} />);
  verifyPropsFor(wrapper, Dummy, defaultPacket);
});

test("Query resolves and data updated", async () => {
  let wrapper = mount(<ComponentToUse a={1} unused={0} />);

  verifyPropsFor(wrapper, Dummy, defaultPacket);

  let p = (client1.nextResult = deferred());
  wrapper.setProps({ active: true });
  wrapper.update();

  verifyPropsFor(wrapper, Dummy, loadingPacket);

  await resolveDeferred(p, { data: { tasks: [] } }, wrapper);
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [] }));
});

test("Query resolves and errors updated", async () => {
  let p = (client1.nextResult = deferred());
  let wrapper = mount(<ComponentToUse a={1} unused={0} active={false} />);

  verifyPropsFor(wrapper, Dummy, defaultPacket);

  wrapper.setProps({ active: true });
  wrapper.update();
  verifyPropsFor(wrapper, Dummy, loadingPacket);

  await resolveDeferred(p, { errors: [{ msg: "a" }] }, wrapper);
  verifyPropsFor(wrapper, Dummy, errorPacket([{ msg: "a" }]));
});

test("Cached data handled", async () => {
  let pData = (client1.nextResult = deferred());
  let wrapper = mount(<ComponentToUse a={1} unused={0} active={true} />);

  await resolveDeferred(pData, { data: { tasks: [{ id: 1 }] } }, wrapper);
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));

  pData = client1.nextResult = deferred();
  wrapper.setProps({ a: 2, active: false });

  await resolveDeferred(pData, { data: { tasks: [{ id: 2 }] } }, wrapper);
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));

  wrapper.setProps({ a: 1 });
  await resolveDeferred(pData, { data: { tasks: [{ id: 1 }] } }, wrapper);
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));

  expect(client1.queriesRun).toBe(1);
});

test("Cached data while loading handled", async () => {
  let pData = (client1.nextResult = deferred());
  let wrapper = mount(<ComponentToUse a={1} unused={0} active={true} />);

  await resolveDeferred(pData, { data: { tasks: [{ id: 1 }] } }, wrapper);
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));

  pData = client1.nextResult = deferred();
  wrapper.setProps({ a: 2, active: false });
  wrapper.update();
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));

  await pause(wrapper);
  wrapper.setProps({ a: 1 });
  wrapper.update();
  verifyPropsFor(wrapper, Dummy, dataPacket({ tasks: [{ id: 1 }] }));
});
