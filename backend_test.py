import requests
import sys
import json
from datetime import datetime
import uuid

class BlockBlastAPITester:
    def __init__(self, base_url="https://gamehub-blast-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_telegram_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_create_user(self):
        """Test user creation"""
        # Generate unique test data
        self.test_telegram_id = 123456789 + int(datetime.now().timestamp())
        
        user_data = {
            "telegram_id": self.test_telegram_id,
            "username": f"test_user_{int(datetime.now().timestamp())}",
            "first_name": "Test",
            "last_name": "User",
            "photo_url": "https://example.com/photo.jpg"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,  # Should return 200 for new user creation
            data=user_data
        )
        
        if success and 'id' in response:
            self.test_user_id = response['id']
            print(f"   Created user ID: {self.test_user_id}")
            return True
        return False

    def test_get_user_by_id(self):
        """Test getting user by ID"""
        if not self.test_user_id:
            print("❌ Skipping - No test user ID available")
            return False
            
        success, response = self.run_test(
            "Get User by ID",
            "GET",
            f"users/{self.test_user_id}",
            200
        )
        return success

    def test_get_user_by_telegram_id(self):
        """Test getting user by Telegram ID"""
        if not self.test_telegram_id:
            print("❌ Skipping - No test telegram ID available")
            return False
            
        success, response = self.run_test(
            "Get User by Telegram ID",
            "GET",
            f"users/telegram/{self.test_telegram_id}",
            200
        )
        return success

    def test_update_user(self):
        """Test updating user"""
        if not self.test_user_id:
            print("❌ Skipping - No test user ID available")
            return False
            
        update_data = {
            "first_name": "Updated",
            "last_name": "TestUser"
        }
        
        success, response = self.run_test(
            "Update User",
            "PUT",
            f"users/{self.test_user_id}",
            200,
            data=update_data
        )
        return success

    def test_submit_score(self):
        """Test score submission"""
        if not self.test_user_id:
            print("❌ Skipping - No test user ID available")
            return False
            
        score_data = {
            "user_id": self.test_user_id,
            "score": 5000,
            "game_duration": 120
        }
        
        success, response = self.run_test(
            "Submit Score",
            "POST",
            "scores",
            200,
            data=score_data
        )
        return success

    def test_get_user_scores(self):
        """Test getting user scores"""
        if not self.test_user_id:
            print("❌ Skipping - No test user ID available")
            return False
            
        success, response = self.run_test(
            "Get User Scores",
            "GET",
            f"scores/user/{self.test_user_id}",
            200
        )
        return success

    def test_get_leaderboard(self):
        """Test leaderboard endpoint"""
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            "leaderboard",
            200
        )
        return success

    def test_get_user_stats(self):
        """Test user statistics"""
        if not self.test_user_id:
            print("❌ Skipping - No test user ID available")
            return False
            
        success, response = self.run_test(
            "Get User Stats",
            "GET",
            f"stats/user/{self.test_user_id}",
            200
        )
        return success

    def test_error_handling(self):
        """Test error handling for non-existent resources"""
        print("\n🔍 Testing Error Handling...")
        
        # Test non-existent user
        fake_user_id = str(uuid.uuid4())
        success, response = self.run_test(
            "Get Non-existent User",
            "GET",
            f"users/{fake_user_id}",
            404
        )
        
        # Test non-existent telegram user
        fake_telegram_id = 999999999
        success2, response2 = self.run_test(
            "Get Non-existent Telegram User",
            "GET",
            f"users/telegram/{fake_telegram_id}",
            404
        )
        
        # Test score submission for non-existent user
        score_data = {
            "user_id": fake_user_id,
            "score": 1000
        }
        success3, response3 = self.run_test(
            "Submit Score for Non-existent User",
            "POST",
            "scores",
            404,
            data=score_data
        )
        
        return success and success2 and success3

def main():
    print("🚀 Starting Block Blast API Testing...")
    print("=" * 50)
    
    tester = BlockBlastAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic connectivity tests
    test_results.append(("Health Check", tester.test_health_check()))
    test_results.append(("Root Endpoint", tester.test_root_endpoint()))
    
    # User management tests
    test_results.append(("Create User", tester.test_create_user()))
    test_results.append(("Get User by ID", tester.test_get_user_by_id()))
    test_results.append(("Get User by Telegram ID", tester.test_get_user_by_telegram_id()))
    test_results.append(("Update User", tester.test_update_user()))
    
    # Game functionality tests
    test_results.append(("Submit Score", tester.test_submit_score()))
    test_results.append(("Get User Scores", tester.test_get_user_scores()))
    test_results.append(("Get Leaderboard", tester.test_get_leaderboard()))
    test_results.append(("Get User Stats", tester.test_get_user_stats()))
    
    # Error handling tests
    test_results.append(("Error Handling", tester.test_error_handling()))
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS")
    print("=" * 50)
    
    failed_tests = []
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
        if not result:
            failed_tests.append(test_name)
    
    print(f"\n📈 Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
        return 1
    else:
        print("\n🎉 All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())