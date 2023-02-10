import { lambdaHandler } from '../../src/helloWorld';
import testEvent from './event';
import { assert } from 'assertthat';

describe('Unit test for app handler', function () {
    test('verifies successful response', async (): Promise<void> => {
        const event = testEvent('get', '/hello');

        const { statusCode, body } = await lambdaHandler(event);

        assert.that(statusCode).is.equalTo(200);
        assert.that(body).is.equalTo(
            JSON.stringify({
                message: 'hello world',
            }),
        );
    });
});
