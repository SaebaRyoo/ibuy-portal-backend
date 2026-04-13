export class ResponseMessage<T> {
  constructor(
    public readonly data: T,
    public readonly message: string,
  ) {}
}
