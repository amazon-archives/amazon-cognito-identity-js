declare module "amazon-cognito-identity-js" {

    import * as AWS from "aws-sdk";

    export interface IAuthenticationDetailsData {
        Username: string;
        Password: string;
    }

    export class AuthenticationDetails {
        constructor(data: IAuthenticationDetailsData);

        public getUsername(): string;
        public getPassword(): string;
        public getValidationData(): any[];
    }

    export interface ICognitoUser {
        Username: string;
        Pool: CognitoUserPool;
    }

    export class CognitoUser {
        constructor(data: ICognitoUser);

        public getSignInUserSession(): CognitoUserSession;
        public getUsername(): string;

        public getAuthenticationFlowType(): string;
        public setAuthenticationFlowType(authenticationFlowType: string): string;

        public getSession(callback: Function): void;
        public authenticateUser(params: any, callbacks: {onSuccess: (session: CognitoUserSession) => void, onFailure: (err: any) => void, newPasswordRequired: (userAttributes: any, requiredAttributes: any) => void, mfaRequired: (challengeName: any, challengeParameters: any) => void, customChallenge: (challengeParameters: any) => void}): void;
        public confirmRegistration(code: string, forceAliasCreation: boolean, callback: (err: any, result: any) => void): void;
        public resendConfirmationCode(callback: (err: any, result: any) => void): void;
        public changePassword(oldPassword: string, newPassword: string, callback: (err: Error, result: any) => void): void;
        public forgotPassword(callbacks: {onSuccess: (result: any) => void, onFailure: (err: Error) => void, inputVerificationCode: (data: any) => void}): void;
        public confirmPassword(verificationCode: string, newPassword: string, callbacks: {onSuccess: () => void, onFailure: (err: Error) => void}): void;
        public sendMFACode(confirmationCode: string, callbacks: {onSuccess: (session: CognitoUserSession) => void, onFailure: (err: any) => void}): void;
        public completeNewPasswordChallenge(newPassword: string, requiredAttributeData: any, callbacks: {onSuccess: (session: CognitoUserSession) => void, onFailure: (err: any) => void, mfaRequired: (challengeName: any, challengeParameters: any) => void, customChallenge: (challengeParameters: any) => void}): void;
    }

    export interface ICognitoUserAttribute {
        Name: string;
        Value: string;
    }

    export class CognitoUserAttribute {
        constructor(data: ICognitoUserAttribute);

        public getValue(): string;
        public setValue(value: string): CognitoUserAttribute;
        public getName(): string;
        public setName(name: string): CognitoUserAttribute;
        public toString(): string;
        public toJSON(): Object;
    }

    export interface ICognitoUserPool {
        UserPoolId: string;
        ClientId: string;
        Paranoia?: number;
    }

    export class CognitoUserPool {
        constructor(data: ICognitoUserPool);

        public getUserPoolId(): string;
        public getClientId(): string;
        public getParanoia(): number

        public setParanoia(paranoia: number): void;

        public signUp(username: string, password: string, userAttributes: any[], validationData: any[], callback: (err: any, result: any) => void): void;

        public getCurrentUser(): CognitoUser;
    }

    export interface ICognitoUserSession {
        IdToken: string;
        AccessToken: string;
        RefreshToken?: string;
    }

    export class CognitoUserSession {
        constructor(data: ICognitoUserSession);

        public getIdToken(): CognitoIdToken;
        public getRefreshToken(): CognitoRefreshToken;
        public getAccessToken(): CognitoAccessToken;
        public isValid(): boolean;
    }

    export class CognitoIdentityServiceProvider {
        public config: AWS.CognitoIdentityServiceProvider.Types.ClientConfiguration;
    }

    export class CognitoAccessToken {
        constructor(accessToken: string);

        public getJwtToken(): string;
        public getExpiration(): number;
    }

    export class CognitoIdToken {
        constructor(idToken: string);

        public getJwtToken(): string;
        public getExpiration(): number;
    }

    export class CognitoRefreshToken {
        constructor(refreshToken: string);

        public getToken(): string;
        public getExpiration(): number;
    }
}
