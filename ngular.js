/**
@fileOverview

@toc

*/

'use strict';


angular.module('ipublic.ntipa-angular', [])
.factory('Account', ['$resource',
    function ($resource) {
        return $resource('./app/rest/account', {}, {
        });
    }]);

angular.module('ipublic.ntipa-angular', [])
.factory('Ente', ['$resource',
   function ($resource) {
       return $resource('/manager/app/rest/account/:action/:enteId/:gruppoId', {}, {
           'enties': { method: 'GET', isArray: true, params: { 'action': 'enties'}},
           'organigramma': { method: 'GET', isArray: false, params: { 'action': 'enties','gruppoId':'organigramma'}},
           'group': { method: 'GET', isArray: false, params: { 'action': 'groups'}}
       });
   }]);

angular.module('ipublic.ntipa-angular', [])
.factory('Password', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/change_password', {}, {
        });
    }]);


angular.module('ipublic.ntipa-angular', [])
.factory('Sessions', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/sessions/:series', {}, {
            'get': { method: 'GET', isArray: true}
        });
    }]);



angular.module('ipublic.ntipa-angular', [])
.factory('AuthenticationSharedService', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','Ente','Oauth2Service',
	function ($rootScope, $http, authService, Session, Account,$log, localStorageService, Ente, Oauth2Service) {
		var keyAuthorization = 'Authorization';
		var keyAccessToken = 'access.token';
		var keySession = 'user.session';
		var keyEntiesSession = 'enties.session';

		var keyCategorias = 'categorias';
		var keyTitolaris = 'titolaris';
		var keyStrutturas = 'strutturas';
		var keyUsers = 'users';



		return {

			login: function (param) {
				var data = "grant_type=password&client_id=box&scope=read&username="+  param.username +"&password="+  param.password ;
				$log.info('data:' + data);
				Oauth2Service.clear();
				$http.post('/authserver/oauth/token', data, {
					headers: {
						"Content-Type": "application/x-www-form-urlencoded"
					},
					ignoreAuthModule: 'ignoreAuthModule'
				}).success(function (data, status, headers, config) {
					$rootScope.authenticationError = false;
					$rootScope.accessToken = data.access_token;
					var token = 'Bearer ' + $rootScope.accessToken;
					$log.info('Authorization:' + token);
					$http.defaults.headers.common[keyAuthorization] = token;

					localStorageService.add(keyAuthorization, token);
					localStorageService.add(keyAccessToken, $rootScope.accessToken);

					Oauth2Service.loadAccount();
				}).error(function (data, status, headers, config) {
					$rootScope.authenticationError = true;
					Session.invalidate();
				});
			},
			changeRoles: function (enteId,gruppoId) {
				$log.info('enteId:' + enteId);
				$log.info('gruppoId:' + gruppoId);

				var data = $rootScope.accessToken+"/"+enteId+"/"+gruppoId;

				$http.get('/authserver/oauth/users/change/roles/'+data )
				.success(function (data, status, headers, config) {
					Oauth2Service.loadAccount();
				}).error(function (data, status, headers, config) {
					$rootScope.authenticationError = true;
                    //Session.invalidate();
                });
			},
			valid: function (authorizedRoles) {
				$log.info('on valid authorizedRoles'+authorizedRoles);

				$http.get('/box/protected/transparent.gif', {
					ignoreAuthModule: 'ignoreAuthModule'
				}).success(function (data, status, headers, config) {
					if (!!Session.login) {
						Account.get(function(data) {
							Session.create(data.login, data.firstName, data.lastName, data.email, data.roles);
							$rootScope.account = data;

							if (!$rootScope.isAuthorized(authorizedRoles)) {
								event.preventDefault();
                                // user is not allowed
                                $rootScope.$broadcast("event:auth-notAuthorized");
                            }

                            $rootScope.authenticated = true;
                        });
					}
					$rootScope.authenticated = !!Session.login;
				}).error(function (data, status, headers, config) {
					$rootScope.authenticated = false;
				});
			},
			isAuthorized: function (authorizedRoles) {
        // $log.info('on isAuthorized authorizedRoles'+authorizedRoles);
         //$log.info(Session.userRoles);

         if (!angular.isArray(authorizedRoles)) {
			if (authorizedRoles == '*') {
				return true;
			}

			authorizedRoles = [authorizedRoles];
         }
			var isAuthorized = false;
			angular.forEach(authorizedRoles, function(authorizedRole) {
			var authorized = (!angular.isUndefined(Session.userRoles) && !!Session.login && !angular.isUndefined(Session.userRoles) &&
			Session.userRoles.indexOf(authorizedRole) !== -1);
			if (authorized || authorizedRole == '*') {
				isAuthorized = true;
			}
         });

         return isAuthorized;
     },
     logout: function () {
		$rootScope.authenticationError = false;
		$rootScope.authenticated = false;
		$rootScope.account = null;
		$rootScope.user = null;
		localStorageService.remove(keyAuthorization);
		localStorageService.remove(keyAccessToken);
		localStorageService.remove(keySession);
		delete $http.defaults.headers.common[keyAuthorization];
		$rootScope.token = '';
		$rootScope.accessToken = '';
		$http.get('/box/app/logout');
		Oauth2Service.clear();
		authService.loginCancelled();

     },
     loadLocalToken: function() {
		Oauth2Service.loadLocalToken();
     }
 };
}]);