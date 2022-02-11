import { ConnectorConfig } from '@logto/schemas';

import RequestError from '@/errors/RequestError';
import { findConnectorById, updateConnector } from '@/queries/connector';

export const getConnectorConfig = async <T extends ConnectorConfig>(id: string): Promise<T> => {
  const connector = await findConnectorById(id);

  if (!connector) {
    throw new RequestError({
      code: 'entity.not_exists_with_id',
      name: 'connector',
      id,
      status: 404,
    });
  }

  return connector.config as T;
};

export const updateConnectorConfig = async <T extends ConnectorConfig>(
  id: string,
  config: T
): Promise<void> => {
  await updateConnector({
    where: { id },
    set: { config },
  });
};