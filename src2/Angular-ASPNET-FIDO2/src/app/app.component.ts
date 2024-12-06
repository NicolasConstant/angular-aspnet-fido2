import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Angular-ASPNET-FIDO2';
  private endpoint = 'https://localhost:7294';

  constructor(private http: HttpClient) { }


  async onRegister($event: any) {
    $event.preventDefault();

    console.log("Register");

    //let username = this.username.value;
    //let displayName = this.displayName.value;

    let username = "test";
    let displayName = "Test Test";

    // passwordfield is omitted in demo
    // let password = this.password.value;

    // possible values: none, direct, indirect
    let attestation_type = "none";
    // possible values: <empty>, platform, cross-platform
    let authenticator_attachment = "";

    // possible values: preferred, required, discouraged
    let user_verification = "preferred";

    // possible values: discouraged, preferred, required
    let residentKey = "discouraged";



    // prepare form post data
    var data = new FormData();
    data.append('username', username);
    data.append('displayName', displayName);
    data.append('attType', attestation_type);
    data.append('authType', authenticator_attachment);
    data.append('userVerification', user_verification);
    data.append('residentKey', residentKey);

    // send to server for registering
    let makeCredentialOptions;
    try {
      makeCredentialOptions = await this.fetchMakeCredentialOptions(data);

    } catch (e) {
      console.error(e);
      let msg = "Something wen't really wrong";
      this.showErrorAlert(msg, "");
    }


    console.log("Credential Options Object", makeCredentialOptions);

    if (makeCredentialOptions.status === "error") {
      console.log("Error creating credential options");
      console.log(makeCredentialOptions.errorMessage);
      this.showErrorAlert(makeCredentialOptions.errorMessage, "");
      return;
    }

    // Turn the challenge back into the accepted format of padded base64
    makeCredentialOptions.challenge = this.coerceToArrayBuffer(makeCredentialOptions.challenge, "");
    // Turn ID into a UInt8Array Buffer for some reason
    makeCredentialOptions.user.id = this.coerceToArrayBuffer(makeCredentialOptions.user.id, "");

    makeCredentialOptions.excludeCredentials = makeCredentialOptions.excludeCredentials.map((c: any) => {
      c.id = this.coerceToArrayBuffer(c.id, "");
      return c;
    });

    if (makeCredentialOptions.authenticatorSelection.authenticatorAttachment === null) makeCredentialOptions.authenticatorSelection.authenticatorAttachment = undefined;

    console.log("Credential Options Formatted", makeCredentialOptions);

    //Swal.fire({
    //  title: 'Registering...',
    //  text: 'Tap your security key to finish registration.',
    //  imageUrl: "/images/securitykey.min.svg",
    //  showCancelButton: true,
    //  showConfirmButton: false,
    //  focusConfirm: false,
    //  focusCancel: false
    //});

    console.log("Creating PublicKeyCredential...");

    let newCredential;
    try {
      newCredential = await navigator.credentials.create({
        publicKey: makeCredentialOptions
      });
    } catch (e) {
      var msg = "Could not create credentials in browser. Probably because the username is already registered with your authenticator. Please change username or authenticator."
      console.error(msg, e);
      this.showErrorAlert(msg, e);
    }


    console.log("PublicKeyCredential Created", newCredential);

    try {
      this.registerNewCredential(newCredential);

    } catch (err: any) {
      this.showErrorAlert(err.message ? err.message : err, "");
    }

  }

  async onSignIn($event: any) {
    $event.preventDefault();

    console.log("SignIn");


    var formData = new FormData();
    formData.append('username', 'test');

    let makeAssertionOptions;
    try {
      var res = await this.http.post<any>(`${this.endpoint}/assertionOptions`, formData);

      //, {
      //  method: 'POST', // or 'PUT'
      //  //body: formData, // data can be `string` or {object}!
      //  headers: {
      //    'Accept': 'application/json'
      //  }
      //});

      //makeAssertionOptions = await res.json();
      makeAssertionOptions = await res.toPromise();

      console.warn(makeAssertionOptions);

    } catch (e) {
      this.showErrorAlert("Request to server failed", e);
    }

    console.log("Assertion Options Object", makeAssertionOptions);

    // show options error to user
    if (makeAssertionOptions.status === "error") {
      console.log("Error creating assertion options");
      console.log(makeAssertionOptions.errorMessage);
      this.showErrorAlert("", makeAssertionOptions.errorMessage);
      return;
    }

    makeAssertionOptions.challenge = this.coerceToArrayBuffer(makeAssertionOptions.challenge, "");
    makeAssertionOptions.allowCredentials.forEach((listItem: any) => {
      listItem.id = this.coerceToArrayBuffer(listItem.id, "");
    });

    console.log("Assertion options", makeAssertionOptions);

    //Swal.fire({
    //  title: 'Logging In...',
    //  text: 'Tap your security key to login.',
    //  imageUrl: "/images/securitykey.min.svg",
    //  showCancelButton: true,
    //  showConfirmButton: false,
    //  focusConfirm: false,
    //  focusCancel: false
    //});

    // ask browser for credentials (browser will ask connected authenticators)
    let credential;
    try {
      credential = await navigator.credentials.get({ publicKey: makeAssertionOptions })
    } catch (err: any) {
      this.showErrorAlert("", err.message ? err.message : err);
    }

    try {
      await this.verifyAssertionWithServer(credential);
    } catch (e) {
      this.showErrorAlert("Could not verify assertion", e);
    }
  }


  showErrorAlert(message: string, error: any) {
    let footermsg = '';
    if (error) {
      footermsg = 'exception:' + error.toString();
    }
    //Swal.fire({
    //  type: 'error',
    //  title: 'Error',
    //  text: message,
    //  footer: footermsg
    //  //footer: '<a href>Why do I have this issue?</a>'
    //})
  }

  async verifyAssertionWithServer(assertedCredential: any) {

    // Move data into Arrays incase it is super long
    let authData = new Uint8Array(assertedCredential.response.authenticatorData);
    let clientDataJSON = new Uint8Array(assertedCredential.response.clientDataJSON);
    let rawId = new Uint8Array(assertedCredential.rawId);
    let sig = new Uint8Array(assertedCredential.response.signature);
    const data = {
      id: assertedCredential.id,
      rawId: this.coerceToBase64Url(rawId),
      type: assertedCredential.type,
      extensions: assertedCredential.getClientExtensionResults(),
      response: {
        authenticatorData: this.coerceToBase64Url(authData),
        clientDataJSON: this.coerceToBase64Url(clientDataJSON),
        signature: this.coerceToBase64Url(sig)
      }
    };

    let response;
    try {
      response = await this.http.post<any>(`${this.endpoint}/makeAssertion`, data).toPromise();    

      //let res = await fetch("/makeAssertion", {
      //  method: 'POST', // or 'PUT'
      //  body: JSON.stringify(data), // data can be `string` or {object}!
      //  headers: {
      //    'Accept': 'application/json',
      //    'Content-Type': 'application/json'
      //  }
      //});

      //response = await res.json();
    } catch (e) {
      this.showErrorAlert("Request to server failed", e);
      throw e;
    }

    console.log("Assertion Object", response);

    // show error
    if (response.status === "error") {
      console.log("Error doing assertion");
      console.log(response.errorMessage);
      this.showErrorAlert("", response.errorMessage);
      return;
    }

    // show success message
    //await Swal.fire({
    //  title: 'Logged In!',
    //  text: 'You\'re logged in successfully.',
    //  type: 'success',
    //  timer: 2000
    //});

    // redirect to dashboard to show keys
    //window.location.href = "/dashboard/" + value("#login-username");
  }

  coerceToArrayBuffer(thing: any, name: any) {
    if (typeof thing === "string") {
      // base64url to base64
      thing = thing.replace(/-/g, "+").replace(/_/g, "/");

      // base64 to Uint8Array
      var str = window.atob(thing);
      var bytes = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      thing = bytes;
    }

    // Array to Uint8Array
    if (Array.isArray(thing)) {
      thing = new Uint8Array(thing);
    }

    // Uint8Array to ArrayBuffer
    if (thing instanceof Uint8Array) {
      thing = thing.buffer;
    }

    // error if none of the above worked
    if (!(thing instanceof ArrayBuffer)) {
      throw new TypeError("could not coerce '" + name + "' to ArrayBuffer");
    }

    return thing;
  };

  coerceToBase64Url(thing: any) {
    // Array or ArrayBuffer to Uint8Array
    if (Array.isArray(thing)) {
      thing = Uint8Array.from(thing);
    }

    if (thing instanceof ArrayBuffer) {
      thing = new Uint8Array(thing);
    }

    // Uint8Array to base64
    if (thing instanceof Uint8Array) {
      var str = "";
      var len = thing.byteLength;

      for (var i = 0; i < len; i++) {
        str += String.fromCharCode(thing[i]);
      }
      thing = window.btoa(str);
    }

    if (typeof thing !== "string") {
      throw new Error("could not coerce to string");
    }

    // base64 to base64url
    // NOTE: "=" at the end of challenge is optional, strip it off here
    thing = thing.replace(/\+/g, "-").replace(/\//g, "_").replace(/=*$/g, "");

    return thing;
  };

  async fetchMakeCredentialOptions(formData: any) {

    console.log("tada");
    console.log(formData);
    let result = await this.http.post<any>(`${this.endpoint}/makeCredentialOptions`, formData).toPromise();
    console.log("toto");
    return result;

    //let response = await fetch('/makeCredentialOptions', {
    //  method: 'POST', // or 'PUT'
    //  body: formData, // data can be `string` or {object}!
    //  headers: {
    //    'Accept': 'application/json'
    //  }
    //});

    //let data = await response.json();

    //return data;
  }

  async registerNewCredential(newCredential: any) {
    // Move data into Arrays incase it is super long
    let attestationObject = new Uint8Array(newCredential.response.attestationObject);
    let clientDataJSON = new Uint8Array(newCredential.response.clientDataJSON);
    let rawId = new Uint8Array(newCredential.rawId);

    const data = {
      id: newCredential.id,
      rawId: this.coerceToBase64Url(rawId),
      type: newCredential.type,
      extensions: newCredential.getClientExtensionResults(),
      response: {
        attestationObject: this.coerceToBase64Url(attestationObject),
        clientDataJSON: this.coerceToBase64Url(clientDataJSON),
        transports: newCredential.response.getTransports()
      }
    };

    let response;
    try {
      response = await this.registerCredentialWithServer(data);
    } catch (e: any) {
      this.showErrorAlert(e, "");
    }

    console.log("Credential Object", response);

    // show error
    if (response.status === "error") {
      console.log("Error creating credential");
      console.log(response.errorMessage);
      this.showErrorAlert(response.errorMessage, "");
      return;
    }

    // show success 
    //Swal.fire({
    //  title: 'Registration Successful!',
    //  text: 'You\'ve registered successfully.',
    //  type: 'success',
    //  timer: 2000
    //});

    // redirect to dashboard?
    //window.location.href = "/dashboard/" + state.user.displayName;
  }

  async registerCredentialWithServer(formData: any) {
    let result = await this.http.post<any>(`${this.endpoint}/makeCredential`, formData).toPromise();    
    return result;

    //let response = await fetch('/makeCredential', {
    //  method: 'POST', // or 'PUT'
    //  body: JSON.stringify(formData), // data can be `string` or {object}!
    //  headers: {
    //    'Accept': 'application/json',
    //    'Content-Type': 'application/json'
    //  }
    //});

    //let data = await response.json();

    //return data;
  }
}
