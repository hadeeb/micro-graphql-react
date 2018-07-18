import React, { StatelessComponent, ComponentClass, ClassicComponentClass } from "react";

type MutationSubscription = {
  when: string | RegExp;
  run: (payload: MutationHandlerPayload, resp: object, variables: object) => any;
};

type MutationHandlerPayload = {
  currentResults: object;
  cache: Cache;
  softReset: () => void;
  hardReset: () => void;
  refresh: () => void;
};

declare class Cache {
  constructor(cacheSize?: number);
  entries: [string, object][];
  get(key): object;
  set(key, results): void;
  delete(key): void;
  clearCache(): void;
}

declare class Client {
  constructor(options: { endpoint: string; noCaching?: boolean; cacheSize?: number; fetchOptions?: object });
  runQuery(query: string, variables?: object): Promise<any>;
  getGraphqlQuery({ query: string, variables: object }): string;
  processMutation(mutation: string, variables?: object): Promise<any>;
  runMutation(mutation: string, variables?: object): Promise<any>;
  getCache(query: string): Cache;
  newCacheForQuery(query: string): Cache;
  setCache(query: string, cache: Cache): void;
}

type BuildQueryOptions = {
  onMutation?: MutationSubscription | MutationSubscription[];
  client?: Client;
  cache?: Cache;
};

type BuildMutationOptions = {
  client?: Client;
};

declare var buildQuery: (queryText: string, variables?: object, options?: BuildQueryOptions) => any;
declare var buildMutation: (mutationText: string, options?: BuildQueryOptions) => any;

type IReactComponent<P = any> = StatelessComponent<P> | ComponentClass<P> | ClassicComponentClass<P>;

declare var compress: any;

export { compress, buildQuery, buildMutation, Client, Cache };
export const setDefaultClient: (client: Client) => void;

//props that are passed to your decorated query component
export type QueryProps = {
  loading: boolean;
  loaded: boolean;
  data: object;
  error: any;
  reload: () => void;
  clearCache: () => void;
  clearCacheAndReload: () => void;
};

//options you can pass to the mutation decorator
export interface MutationOptions {
  client?: Client;
  mapProps?: (props: object) => object;
}

//props that are passed to your decorated mutation component
export type MutationProps = {
  running: boolean;
  finished: boolean;
  runMutation: (variables: object) => void;
};

//options you can pass to the query decorator
export interface QueryOptions {
  client?: Client;
  mapProps?: (props: object) => object;
}

//query decorator
export function query(
  queryText: string,
  queryFn?: (componentProps: object) => object,
  options?: QueryOptions
): <T extends IReactComponent>(input: T) => T;

//mutation decorator
export function mutation(mutation: string, options?: MutationOptions): <T extends IReactComponent>(input: T) => T;

export declare class GraphQL extends React.Component<{ query?: any; mutation?: any }, any> {}
