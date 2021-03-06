import { React, Component, mount, ClientMock, setDefaultClient, basicQuery, useQuery, useMutation } from "../testSuiteInitialize";
import { buildQuery, buildMutation } from "../../src/util";

let client1;

beforeEach(() => {
  client1 = new ClientMock("endpoint1");
  setDefaultClient(client1);
});

const Dummy = () => null;

const getQueryAndMutationComponent = options => props => {
  let q1 = useQuery([basicQuery, { query: props.query }, options]);
  let m1 = useMutation(["someMutation{}"]);

  return <Dummy {...props} {...{ q1, m1 }} />;
};

const getQueryAndMutationComponent2 = options => props => {
  let { loading, loaded, data } = useQuery(buildQuery(basicQuery, { query: props.query }, options));
  let { running, finished, runMutation } = useMutation(buildMutation("someMutation{}"));

  return <Dummy {...props} {...{ loading, loaded, data, running, runMutation }} />;
};

const getQ1Data = wrapper =>
  wrapper
    .children()
    .find(Dummy)
    .props().q1.data;

const runM1Mutation = (wrapper, args) =>
  wrapper
    .children()
    .find(Dummy)
    .props()
    .m1.runMutation(args);

test("Mutation listener updates cache", async () => {
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: "updateBook",
      run: ({ cache }, { updateBook: { Book } }) => {
        cache.entries.forEach(([key, results]) => {
          let CachedBook = results.data.Books.find(b => b.id == Book.id);
          CachedBook && Object.assign(CachedBook, Book);
        });
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "__WRONG__Eve" }] } };
  let wrapper = mount(<Component query="a" />);

  await waitAndUpdate(wrapper);

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }] } };
  await setPropsAndWait(wrapper, { query: "b" });

  client1.nextMutationResult = { updateBook: { Book: { id: 2, author: "Eve" } } };
  await runM1Mutation(wrapper);

  expect(client1.queriesRun).toBe(2); //run for new query args

  await setPropsAndWait(wrapper, { query: "a" });

  expect(client1.queriesRun).toBe(2); //still loads from cache
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] }); //loads updated data
});

test("Mutation listener updates cache with mutation args - string", async () => {
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: "deleteBook",
      run: ({ cache, refresh }, resp, args) => {
        cache.entries.forEach(([key, results]) => {
          results.data.Books = results.data.Books.filter(b => b.id != args.id);
          refresh();
        });
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] } };
  let wrapper = mount(<Component query="a" />);
  await waitAndUpdate(wrapper);

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }] } };
  await setPropsAndWait(wrapper, { query: "b" });

  client1.nextMutationResult = { deleteBook: { success: true } };
  await runM1Mutation(wrapper, { id: 1 });

  expect(client1.queriesRun).toBe(2); //run for new query args
  expect(getQ1Data(wrapper)).toEqual({ Books: [] }); //loads updated data

  await setPropsAndWait(wrapper, { query: "a" });

  expect(client1.queriesRun).toBe(2); //still loads from cache
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 2, title: "Book 2", author: "Eve" }] }); //loads updated data
});

test("Mutation listener updates cache with mutation args - regex", async () => {
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: /deleteBook/,
      run: ({ cache, refresh }, resp, args) => {
        cache.entries.forEach(([key, results]) => {
          results.data.Books = results.data.Books.filter(b => b.id != args.id);
          refresh();
        });
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] } };
  let wrapper = mount(<Component query="a" />);
  await waitAndUpdate(wrapper);

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }] } };
  await setPropsAndWait(wrapper, { query: "b" });

  client1.nextMutationResult = { deleteBook: { success: true } };
  await runM1Mutation(wrapper, { id: 1 });

  expect(client1.queriesRun).toBe(2); //run for new query args
  expect(getQ1Data(wrapper)).toEqual({ Books: [] }); //loads updated data

  await setPropsAndWait(wrapper, { query: "a" });

  expect(client1.queriesRun).toBe(2); //still loads from cache
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 2, title: "Book 2", author: "Eve" }] }); //loads updated data
});

test("Mutation listener updates cache then refreshes from cache", async () => {
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: "updateBook",
      run: ({ cache, refresh }, { updateBook: { Book } }) => {
        cache.entries.forEach(([key, results]) => {
          let newBooks = results.data.Books.map(b => {
            if (b.id == Book.id) {
              return Object.assign({}, b, Book);
            }
            return b;
          });
          //do this immutable crap just to make sure tests don't accidentally pass because of object references to current props being updated - in real life the component would not be re-rendered, but here's we're verifying the props directly
          let newResults = { ...results };
          newResults.data = { ...newResults.data };
          newResults.data.Books = newBooks;
          cache.set(key, newResults);
          refresh();
        });
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "__WRONG__Eve" }] } };
  let wrapper = mount(<Component query="a" />);
  await waitAndUpdate(wrapper);

  client1.nextMutationResult = { updateBook: { Book: { id: 2, author: "Eve" } } };
  await runM1Mutation(wrapper);
  await waitAndUpdate(wrapper);

  expect(client1.queriesRun).toBe(1); //refreshed from cache
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] }); //refreshed with updated data
});

test("Mutation listener - soft reset - props right, cache cleared", async () => {
  let componentsCache;
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: "updateBook",
      run: ({ cache, softReset, currentResults }, { updateBook: { Book } }) => {
        componentsCache = cache;
        let CachedBook = currentResults.Books.find(b => b.id == Book.id);
        CachedBook && Object.assign(CachedBook, Book);
        softReset(currentResults);
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "__WRONG__Eve" }] } };
  let wrapper = mount(<Component query="a" />);
  await waitAndUpdate(wrapper);

  client1.nextMutationResult = { updateBook: { Book: { id: 2, author: "Eve" } } };
  await runM1Mutation(wrapper);

  expect(componentsCache.entries.length).toBe(0); //cache is cleared!
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] }); //updated data is now there
});

test("Mutation listener - hard reset - props right, cache cleared, client qeried", async () => {
  let componentsCache;
  let Component = getQueryAndMutationComponent({
    onMutation: {
      when: "updateBook",
      run: ({ cache, hardReset, currentResults }) => {
        componentsCache = cache;
        hardReset();
      }
    }
  });

  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "__WRONG__Eve" }] } };
  let wrapper = mount(<Component query="a" />);
  await waitAndUpdate(wrapper);

  expect(client1.queriesRun).toBe(1); //just the one
  client1.nextResult = { data: { Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] } };
  client1.nextMutationResult = { updateBook: { Book: { id: 2, author: "Eve" } } };
  await runM1Mutation(wrapper);
  await waitAndUpdate(wrapper);

  expect(componentsCache.entries.length).toBe(1); //just the most recent entry
  expect(getQ1Data(wrapper)).toEqual({ Books: [{ id: 1, title: "Book 1", author: "Adam" }, { id: 2, title: "Book 2", author: "Eve" }] }); //updated data is now there
  expect(client1.queriesRun).toBe(2); //run from the hard reset
});

async function setPropsAndWait(renderedComponent, props) {
  renderedComponent.setProps(props);
  await waitAndUpdate(renderedComponent);
}
function waitAndUpdate(renderedComponent) {
  return new Promise(res => {
    setTimeout(() => {
      renderedComponent.update();
      res();
    }, 1);
  });
}
