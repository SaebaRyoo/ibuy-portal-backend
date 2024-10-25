export default class Result<T> {
  data: T;
  code: number;
  message: string;
  success: boolean;

  constructor(data: T, message: string = 'success', code: number = 200) {
    this.data = data;
    this.code = code;
    this.message = message;
    this.success = true;
  }
}
