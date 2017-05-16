declare module "amazon-cognito-identity-js" {

    import * as AWS from "aws-sdk";

    export type NodeCallback<E,T> = (err?: E, result?: T) => void;

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

    export interface ICognitoStorage {
        setItem(key: string, value: string): void;
        getItem(key: string): string;
        removeItem(key: string): void;
        clear(): void;
    }

    export interface ICognitoUserData {
        Username: string;
        Pool: CognitoUserPool;
        Storage?: ICognitoStorage;
    }

    export class CognitoUser {
        constructor(data: ICognitoUserData);

        public getSignInUserSession(): CognitoUserSession | null;
        public getUsername(): string;

        public getAuthenticationFlowType(): string;
        public setAuthenticationFlowType(authenticationFlowType: string): string;

        public getSession(callback: Function): any;
        public refreshSession(refreshToken: CognitoRefreshToken, callback: NodeCallback<any, any>): void;
        public authenticateUser(authenticationDetails: AuthenticationDetails,
                                callbacks: {
                                    onSuccess: (session: CognitoUserSession) => void,
                                    onFailure: (err: any) => void,
                                    newPasswordRequired?: (userAttributes: any, requiredAttributes: any) => void,
                                    mfaRequired?: (challengeName: any, challengeParameters: any) => void,
                                    customChallenge?: (challengeParameters: any) => void
                                }): void;
        public confirmRegistration(code: string, forceAliasCreation: boolean, callback: NodeCallback<any, any>): void;
        public resendConfirmationCode(callback: NodeCallback<Error, "SUCCESS">): void;
        public changePassword(oldPassword: string, newPassword: string, callback: NodeCallback<Error, "SUCCESS">): void;
        public forgotPassword(callbacks: { onSuccess: () => void, onFailure: (err: Error) => void, inputVerificationCode?: (data: any) => void }): void;
        public confirmPassword(verificationCode: string, newPassword: string, callbacks: { onSuccess: () => void, onFailure: (err: Error) => void }): void;
        public setDeviceStatusRemembered(callbacks: { onSuccess: (success: string) => void, onFailure: (err: any) => void }): void;
        public setDeviceStatusNotRemembered(callbacks: { onSuccess: (success: string) => void, onFailure: (err: any) => void }): void;
        public getDevice(callbacks: {onSuccess: (success: string) => void, onFailure: (err: Error) => void}): any;
        public sendMFACode(confirmationCode: string, callbacks: { onSuccess: (session: CognitoUserSession) => void, onFailure: (err: any) => void }): void;
        public completeNewPasswordChallenge(newPassword: string,
                                            requiredAttributeData: any,
                                            callbacks: {
                                                onSuccess: (session: CognitoUserSession) => void,
                                                onFailure: (err: any) => void,
                                                mfaRequired?: (challengeName: any, challengeParameters: any) => void,
                                                customChallenge?: (challengeParameters: any) => void
                                            }): void;
        public signOut(): void;
        public globalSignOut(callbacks: { onSuccess: (msg: string) => void, onFailure: (err: Error) => void }): void;
        public verifyAttribute(attributeName: string, confirmationCode: string, callbacks: { onSuccess: (success: string) => void, onFailure: (err: Error) => void }): void;
        public getUserAttributes(callback: NodeCallback<Error, CognitoUserAttribute[]>): void;
        public updateAttributes(attributes: ICognitoUserAttributeData[], callback: NodeCallback<Error,string>): void;
        public deleteAttributes(attributeList: string[], callback: NodeCallback<Error, string>): void;
        public getAttributeVerificationCode(name: string, callbacks: { onSuccess: () => void, onFailure: (err: Error) => void, inputVerificationCode: (data: string) => void }): void;
        public deleteUser(callback: (err :Error, success: string)=>void): void;
    }

    export interface ICognitoUserAttributeData {
        Name: string;
        Value: string;
    }

    export class CognitoUserAttribute {
        constructor(data: ICognitoUserAttributeData);

        public getValue(): string;
        public setValue(value: string): CognitoUserAttribute;
        public getName(): string;
        public setName(name: string): CognitoUserAttribute;
        public toString(): string;
        public toJSON(): Object;
    }

    export interface ISignUpResult {
        user: CognitoUser;
        userConfirmed: boolean;
    }

    export interface ICognitoUserPoolData {
        UserPoolId: string;
        ClientId: string;
        Storage?: ICognitoStorage;
    }

    export class CognitoUserPool {
        constructor(data: ICognitoUserPoolData);

        public getUserPoolId(): string;
        public getClientId(): string;

        public signUp(username: string, password: string, userAttributes: CognitoUserAttribute[], validationData: CognitoUserAttribute[], callback: NodeCallback<Error,ISignUpResult>): void;

        public getCurrentUser(): CognitoUser | null;
    }

    export interface ICognitoUserSessionData {
        IdToken: string;
        AccessToken: string;
        RefreshToken?: string;
    }

    export class CognitoUserSession {
        constructor(data: ICognitoUserSessionData);

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
