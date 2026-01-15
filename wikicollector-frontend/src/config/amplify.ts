import type { ResourcesConfig } from 'aws-amplify';

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USERPOOLID || '',
      userPoolClientId: import.meta.env.VITE_USERPOOLWEBCLIENTID || '',
      identityPoolId: import.meta.env.VITE_IDENTITYPOOLID || '',
      loginWith: {
        username: true,
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: false,
        },
      },
      passwordFormat: {
        minLength: 6,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_GRAPHQLENDPOINT || '',
      region: import.meta.env.VITE_AWSREGION || 'ap-northeast-1',
      defaultAuthMode: 'userPool',
    },
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_OBJECT_BUCKET_NAME || '',
      region: import.meta.env.VITE_AWSREGION || 'ap-northeast-1',
      buckets: {
        images: {
          bucketName: import.meta.env.VITE_WIKI_IMAGE_BUCKET_NAME || '',
          region: import.meta.env.VITE_AWSREGION || 'ap-northeast-1',
        }
      }
    },
  },
};
