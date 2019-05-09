import React from "react";

type MutationSubscription = {
  when: string | RegExp;
  run: (payload: MutationHandlerPayload, resp: any, variables: any) => any;
};

type MutationHandlerPayload = {
  currentResults: any;
  cache: Cache;
  softReset: (newResults: any) => void;
  hardReset: () => void;
  refresh: () => void;
};

type QueryPacket = [string, any, BuildQueryOptions];

type MutationPacket = [string, BuildQueryOptions];

type QueryPayload<Data = any, Error = any> = {
  loading: boolean;
  loaded: boolean;
  data: Data;
  error: Error;
  currentQuery: string;
  reload: () => void;
  clearCache: () => void;
  clearCacheAndReload: () => void;
};

type MutationPayload<Response = any> = {
  running: boolean;
  finished: boolean;
  runMutation: (variables: any) => Promise<Response>;
};

export class Cache {
  constructor(cacheSize?: number);
  entries: [string, any][];
  get(key: string): any;
  set(key: string, results: any): void;
  delete(key: string): void;
  clearCache(): void;
}

export class Client {
  constructor(options: { endpoint: string; noCaching?: boolean; cacheSize?: number; fetchOptions?: any });
  runQuery(query: string, variables?: any): Promise<any>;
  getGraphqlQuery({ query, variables }: { query: string; variables: any }): string;
  processMutation(mutation: string, variables?: any): Promise<any>;
  runMutation(mutation: string, variables?: any): Promise<any>;
  getCache(query: string): Cache;
  newCacheForQuery(query: string): Cache;
  setCache(query: string, cache: Cache): void;
  subscribeMutation(subscription, options?): () => void;
  forceUpdate(query): void;
}

type BuildQueryOptions = {
  onMutation?: MutationSubscription | MutationSubscription[];
  client?: Client;
  cache?: Cache;
  active?: boolean;
};

type BuildMutationOptions = {
  client?: Client;
};

export function buildQuery(queryText: string, variables?: any, options?: BuildQueryOptions): QueryPacket;

export function buildMutation(mutationText: string, options?: BuildQueryOptions): MutationPacket;

export function compress(strings: TemplateStringsArray, ...expressions: any[]): string;

export function setDefaultClient(client: Client): void;

export function getDefaultClient(): Client;

export function useQuery<Data, Error = any>(queryPacket: QueryPacket): QueryPayload<Data, Error>;

export function useMutation<Response>(mutationPacket: MutationPacket): MutationPayload<Response>;

type RenderProps<Query, Mutation> = Record<keyof Query, QueryPayload> & Record<keyof Mutation, MutationPayload>;

type QueryMap = { [s: string]: QueryPacket };

type MutationMap = { [s: string]: MutationPacket };

type ComponentPacket<Query extends QueryMap, Mutation extends MutationMap> = {
  query?: Query;
  mutation?: Mutation;
  children(fn: RenderProps<Query, Mutation>): React.ReactNode;
};

export function GraphQL<QueryType extends QueryMap = {}, MutationType extends MutationMap = {}>(
  props: ComponentPacket<QueryType, MutationType>
): JSX.Element;
